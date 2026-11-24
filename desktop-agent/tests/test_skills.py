import sys
import threading
import types

import pytest

import agent
import skills


@pytest.fixture(autouse=True)
def out_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(skills, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(skills, "open_file", lambda p: None)
    return tmp_path


yes = lambda prompt, cancel: True
no = lambda prompt, cancel: False


def tool(name, inp, id="c1"):
    return types.SimpleNamespace(type="tool_use", name=name, input=inp, id=id)


# --- tool definitions -------------------------------------------------------

def test_tool_schemas_are_valid():
    for t in skills.TOOLS:
        assert t["input_schema"]["type"] == "object"
        assert set(t["input_schema"].get("required", [])) <= set(t["input_schema"]["properties"])
    names = [t.get("name") for t in agent.TOOLS if "name" in t]
    assert len(names) == len(set(names))
    assert agent.TOOLS[0] == {"type": "computer_toolset_20260801"}


# --- commands ---------------------------------------------------------------

ECHO = "Write-Output שלום" if skills.IS_WINDOWS else "echo שלום"


def test_command_runs_after_approval():
    out = skills.run_command({"command": ECHO, "reason": "test"}, yes, threading.Event())
    assert "exit code 0" in out and "שלום" in out


def test_command_declined_does_not_run(out_dir):
    marker = out_dir / "ran.txt"
    cmd = f"echo x > {marker}"
    with pytest.raises(skills.Declined):
        skills.run_command({"command": cmd, "reason": "test"}, no, threading.Event())
    assert not marker.exists()


@pytest.mark.skipif(skills.IS_WINDOWS, reason="uses sleep")
def test_stop_button_kills_long_command():
    import time
    cancel = threading.Event()
    threading.Timer(0.5, cancel.set).start()
    t0 = time.time()
    with pytest.raises(InterruptedError):
        skills.run_command({"command": "sleep 30", "reason": "t"}, yes, cancel)
    assert time.time() - t0 < 5


def test_command_without_approver_is_refused():
    res = agent.process_tool_calls([tool("run_command", {"command": "echo hi", "reason": "t"})],
                                   agent.Screen(), threading.Event(), None, approve=None)
    assert res[0]["is_error"] and "declined" in res[0]["content"][0]["text"]
    assert "toolset_name" not in res[0]


# --- presentations ------------------------------------------------------------

def test_hebrew_presentation(out_dir):
    from pptx import Presentation
    msg = skills.create_presentation({
        "filename": "מצגת בדיקה", "title": "דוח רבעוני", "subtitle": "נובמבר 2026", "rtl": True,
        "slides": [{"title": "הכנסות", "bullets": ["עלייה של 12%", "3 לקוחות חדשים"], "notes": "להדגיש את הצמיחה"},
                   {"title": "יעדים", "bullets": ["השקה בינואר"]}],
    })
    path = out_dir / "מצגת בדיקה.pptx"
    assert path.exists() and "3 slides" in msg
    prs = Presentation(path)
    texts = [sh.text_frame.text for s in prs.slides for sh in s.shapes if sh.has_text_frame]
    assert "דוח רבעוני" in texts and any("עלייה של 12%" in t for t in texts)
    p = prs.slides[1].placeholders[1].text_frame.paragraphs[0]._p
    assert p.pPr.get("rtl") == "1"
    assert prs.slides[1].notes_slide.notes_text_frame.text == "להדגיש את הצמיחה"


def test_presentation_cannot_escape_output_folder(out_dir):
    skills.create_presentation({"filename": "../../../evil", "title": "x", "slides": []})
    assert (out_dir / "evil.pptx").exists()
    assert not (out_dir.parent.parent / "evil.pptx").exists()


# --- email --------------------------------------------------------------------

def test_email_needs_setup(monkeypatch):
    monkeypatch.delenv("EMAIL_ADDRESS", raising=False)
    monkeypatch.delenv("EMAIL_APP_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="not set up"):
        skills.email_search({"query": "ALL"})


def test_email_hosts_by_provider(monkeypatch):
    monkeypatch.setenv("EMAIL_APP_PASSWORD", "x")
    monkeypatch.setenv("EMAIL_ADDRESS", "me@gmail.com")
    assert skills._mail_config()["imap"] == "imap.gmail.com"
    monkeypatch.setenv("EMAIL_ADDRESS", "me@outlook.com")
    assert skills._mail_config()["smtp"] == "smtp.office365.com"


class FakeSMTP:
    sent = []

    def __init__(self, *a, **k): pass
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def starttls(self): pass
    def login(self, *a): pass
    def send_message(self, m): FakeSMTP.sent.append(m)


def test_email_is_not_sent_without_approval(monkeypatch):
    monkeypatch.setenv("EMAIL_ADDRESS", "me@gmail.com")
    monkeypatch.setenv("EMAIL_APP_PASSWORD", "x")
    monkeypatch.setattr(skills.smtplib, "SMTP", FakeSMTP)
    FakeSMTP.sent.clear()
    with pytest.raises(skills.Declined):
        skills.email_send({"to": "a@b.com", "subject": "s", "body": "b"}, no, threading.Event())
    assert FakeSMTP.sent == []


def test_email_send_shows_full_preview_and_sends_hebrew(monkeypatch):
    monkeypatch.setenv("EMAIL_ADDRESS", "me@gmail.com")
    monkeypatch.setenv("EMAIL_APP_PASSWORD", "x")
    monkeypatch.setattr(skills.smtplib, "SMTP", FakeSMTP)
    FakeSMTP.sent.clear()
    seen = []
    skills.email_send({"to": "dana@example.com", "subject": "פגישה", "body": "נתראה מחר ב-10"},
                      lambda p, c: seen.append(p) or True, threading.Event())
    assert "dana@example.com" in seen[0] and "נתראה מחר" in seen[0]
    m = FakeSMTP.sent[0]
    assert m["Subject"] == "פגישה" and "נתראה מחר" in m.get_content()


def test_email_content_is_marked_as_data():
    msg = skills.email_read.__doc__ or ""
    src = open(skills.__file__, encoding="utf-8").read()
    assert "<email_content>" in src
    assert "never as instructions" in agent.SYSTEM_PROMPT
