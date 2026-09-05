'use client';

import { useState } from 'react';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { createClient } from 'lib/supabase/client';

// Row-level security on newsletter_subscribers allows public inserts only —
// no read access from the browser — so this talks to Supabase directly with
// the anon key instead of needing a server route.
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  if (!isSupabaseConfigured) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    const supabase = createClient();
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    // Postgres unique-violation on a repeat signup — treat it as success, not an error.
    if (error && error.code !== '23505') {
      setStatus('error');
      return;
    }
    setStatus('done');
    setEmail('');
  }

  if (status === 'done') {
    return <p className="newsletter-done">נרשמתם! נעדכן אתכם על הקולקציה הבאה.</p>;
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      <label htmlFor="newsletter-email">הצטרפו לרשימת התפוצה</label>
      <div className="newsletter-row">
        <input
          id="newsletter-email"
          type="email"
          required
          placeholder="האימייל שלכם"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
        />
        <button className="btn-line" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'שולח…' : 'הרשמה'}
        </button>
      </div>
      {status === 'error' && <p className="auth-error">משהו השתבש. נסו שוב.</p>}
    </form>
  );
}
