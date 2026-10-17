-- AI Sales Agent — initial schema.
--
-- Tenant isolation: every business-owned table carries business_id and has
-- row-level security FORCED on, so even the table owner (the app's own role)
-- only sees rows of the business named in the transaction-local setting
-- app.business_id. Code that legitimately crosses tenants (resolving which
-- business an incoming phone number belongs to, the outbound dispatcher, the
-- retention job) must say so explicitly by setting app.system = 'on'
-- (lib/sales/db.js: withSystem). Nothing else can read another tenant's rows,
-- even if a query forgets its WHERE business_id = ... clause.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION sales_tenant_visible(row_business uuid) RETURNS boolean
    LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.system', true), '') = 'on'
        OR row_business = nullif(current_setting('app.business_id', true), '')::uuid
$$;

-- Strength of a call outcome; a call keeps the strongest one reached.
-- Must match OUTCOME_ORDER in lib/sales/calls.js.
CREATE OR REPLACE FUNCTION outcome_rank(outcome text) RETURNS integer
    LANGUAGE sql IMMUTABLE AS $$
    SELECT coalesce(array_position(ARRAY['failed', 'no_answer', 'info_only', 'not_interested', 'lead_captured',
        'follow_up', 'transferred', 'meeting_booked', 'do_not_call'], outcome), 0)
$$;

-- --- Accounts --------------------------------------------------------------

CREATE TABLE sales_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX sales_sessions_user ON sales_sessions(user_id);

CREATE TABLE sales_rate_limits (
    bucket text PRIMARY KEY,
    window_start timestamptz NOT NULL,
    count integer NOT NULL
);

-- --- Businesses ------------------------------------------------------------

CREATE TABLE businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    industry text NOT NULL DEFAULT '',
    country text NOT NULL DEFAULT 'IL',
    timezone text NOT NULL DEFAULT 'Asia/Jerusalem',
    language text NOT NULL DEFAULT 'he-IL',
    voice text NOT NULL DEFAULT '',
    tone text NOT NULL DEFAULT '',
    agent_name text NOT NULL DEFAULT '',
    target_audience text NOT NULL DEFAULT '',
    sales_goal text NOT NULL DEFAULT 'meeting'
        CHECK (sales_goal IN ('sell', 'meeting', 'lead', 'handoff')),
    business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
    appointment_minutes integer NOT NULL DEFAULT 30 CHECK (appointment_minutes BETWEEN 5 AND 480),
    contact_phone text NOT NULL DEFAULT '',
    contact_email text NOT NULL DEFAULT '',
    handoff_phone text NOT NULL DEFAULT '',
    handoff_rules text NOT NULL DEFAULT '',
    -- The number customers dial (E.164). Inbound webhooks resolve the business by it.
    inbound_number text UNIQUE,
    outbound_enabled boolean NOT NULL DEFAULT false,
    calling_window jsonb NOT NULL DEFAULT '{"start":"09:00","end":"20:00","days":[0,1,2,3,4]}'::jsonb,
    max_calls_per_hour integer NOT NULL DEFAULT 20 CHECK (max_calls_per_hour BETWEEN 0 AND 1000),
    max_attempts_per_lead integer NOT NULL DEFAULT 3 CHECK (max_attempts_per_lead BETWEEN 1 AND 20),
    store_transcripts boolean NOT NULL DEFAULT true,
    retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 1 AND 3650),
    -- Rates used for the dashboard's cost estimate (USD).
    telephony_cost_per_minute numeric(10, 4) NOT NULL DEFAULT 0.0140,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_members (
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (business_id, user_id)
);
CREATE INDEX business_members_user ON business_members(user_id);

-- --- Knowledge base --------------------------------------------------------

CREATE TABLE knowledge_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('product', 'service', 'price', 'promotion', 'policy', 'faq', 'other')),
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    price numeric(12, 2),
    currency text NOT NULL DEFAULT 'ILS',
    -- Only active AND verified items ever reach the agent.
    active boolean NOT NULL DEFAULT true,
    verified boolean NOT NULL DEFAULT false,
    search tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_items_business ON knowledge_items(business_id);
CREATE INDEX knowledge_items_search ON knowledge_items USING gin(search);

-- --- Leads and contact rules -----------------------------------------------

CREATE TABLE leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT '',
    phone text NOT NULL,
    email text NOT NULL DEFAULT '',
    timezone text,
    source text NOT NULL DEFAULT 'manual',
    status text NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 'contacted', 'interested', 'not_interested', 'meeting_booked',
        'handed_off', 'do_not_call', 'won', 'lost')),
    consent_call boolean NOT NULL DEFAULT false,
    consent_sms boolean NOT NULL DEFAULT false,
    consent_email boolean NOT NULL DEFAULT false,
    consent_source text NOT NULL DEFAULT '',
    -- Information the business is allowed to use about this lead on a call.
    allowed_context text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    needs text NOT NULL DEFAULT '',
    attempts integer NOT NULL DEFAULT 0,
    last_called_at timestamptz,
    next_call_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, phone)
);
CREATE INDEX leads_business_status ON leads(business_id, status);

CREATE TABLE do_not_call (
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone text NOT NULL,
    reason text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (business_id, phone)
);

-- --- Calls -----------------------------------------------------------------

CREATE TABLE calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel text NOT NULL CHECK (channel IN ('phone', 'web_test')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('queued', 'active', 'completed', 'transferred', 'failed', 'no_answer')),
    provider_call_sid text UNIQUE,
    from_number text NOT NULL DEFAULT '',
    to_number text NOT NULL DEFAULT '',
    goal text NOT NULL DEFAULT '',
    outcome text CHECK (outcome IN (
        'meeting_booked', 'lead_captured', 'transferred', 'not_interested', 'do_not_call',
        'follow_up', 'info_only', 'no_answer', 'failed')),
    summary text NOT NULL DEFAULT '',
    sentiment text NOT NULL DEFAULT '',
    -- Model conversation, kept append-only between turns. Cleared at call end
    -- when the business does not store transcripts, and by the retention job.
    model_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- A note for the model's next turn (e.g. "your last reply was blocked").
    pending_note text NOT NULL DEFAULT '',
    silence_count integer NOT NULL DEFAULT 0,
    -- Set when the agent decided to end the call or transfer it.
    end_requested boolean NOT NULL DEFAULT false,
    transfer_to text,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    duration_seconds integer,
    turn_count integer NOT NULL DEFAULT 0,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    ai_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
    telephony_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
    guardrail_blocks integer NOT NULL DEFAULT 0,
    errors integer NOT NULL DEFAULT 0,
    total_latency_ms bigint NOT NULL DEFAULT 0,
    quality_score numeric(4, 2),
    quality_notes text NOT NULL DEFAULT '',
    complaint boolean NOT NULL DEFAULT false,
    transcript_purged boolean NOT NULL DEFAULT false
);
CREATE INDEX calls_business_started ON calls(business_id, started_at DESC);

CREATE TABLE call_turns (
    id bigserial PRIMARY KEY,
    call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('customer', 'agent', 'tool', 'system')),
    content text NOT NULL DEFAULT '',
    tool_name text,
    latency_ms integer,
    flag text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_turns_call ON call_turns(call_id, id);

-- --- Outcomes --------------------------------------------------------------

CREATE TABLE appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled')),
    customer_name text NOT NULL DEFAULT '',
    customer_phone text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    -- Two booked appointments of one business can never overlap, even when two
    -- calls book the same slot at the same moment.
    EXCLUDE USING gist (business_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked')
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
    kind text NOT NULL CHECK (kind IN ('follow_up_call', 'human_callback', 'answer_question', 'review_call', 'other')),
    description text NOT NULL DEFAULT '',
    due_at timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_business_status ON tasks(business_id, status);

-- Things the agent may only PROPOSE: a person approves them in the dashboard.
CREATE TABLE pending_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    kind text NOT NULL CHECK (kind IN ('send_sms', 'send_email', 'send_quote')),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sent', 'failed')),
    result text NOT NULL DEFAULT '',
    decided_by uuid REFERENCES sales_users(id) ON DELETE SET NULL,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id bigserial PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id uuid REFERENCES sales_users(id) ON DELETE SET NULL,
    actor text NOT NULL CHECK (actor IN ('user', 'agent', 'system')),
    action text NOT NULL,
    detail jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_business ON audit_log(business_id, created_at DESC);

-- --- Row-level security ----------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'business_members', 'knowledge_items', 'leads', 'do_not_call', 'calls', 'call_turns',
        'appointments', 'tasks', 'pending_actions', 'audit_log'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (sales_tenant_visible(business_id)) WITH CHECK (sales_tenant_visible(business_id))',
            t
        );
    END LOOP;
END $$;

-- The businesses table itself: a tenant sees only its own row.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON businesses USING (sales_tenant_visible(id)) WITH CHECK (sales_tenant_visible(id));
