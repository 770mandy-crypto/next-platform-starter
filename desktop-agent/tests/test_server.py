import json
import threading
import types
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

import agent
import server


@pytest.fixture
def api():
    m = agent.TaskManager()
    args = types.SimpleNamespace(port=0)
    st = server.State(m, args)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(st))
    args.port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{args.port}"

    def call(path, body=None, origin=None):
        req = urllib.request.Request(base + path, method="POST" if body is not None else "GET",
                                     data=json.dumps(body).encode() if body is not None else None)
        req.add_header("Content-Type", "application/json")
        if origin:
            req.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read()
                return r.status, (json.loads(raw) if r.headers.get_content_type() == "application/json" else raw)
        except urllib.error.HTTPError as e:
            return e.code, None
    yield call, m, st
    httpd.shutdown()


def test_dashboard_served_with_doctype_and_hebrew(api):
    call, *_ = api
    code, html = call("/")
    assert code == 200 and html.startswith(b"<!doctype html>")
    assert "הסוכן שלי".encode() in html


def test_add_list_cancel_tasks(api):
    call, m, _ = api
    code, r = call("/api/task", {"text": "תפתח את המחשבון"})
    assert code == 200
    code, s = call("/api/state")
    assert s["queue"][0]["text"] == "תפתח את המחשבון"
    call(f"/api/cancel/{r['id']}", {})
    code, s = call("/api/state")
    assert s["queue"] == [] and s["finished"][0]["status"] == "cancelled"


def test_wake_increments(api, monkeypatch):
    call, m, st = api
    monkeypatch.setattr(server.webbrowser, "open", lambda *a, **k: None)
    call("/api/wake", {})
    code, s = call("/api/state")
    assert s["wake"] == 1


def test_other_websites_cannot_control_agent(api):
    call, m, _ = api
    code, _ = call("/api/task", {"text": "evil"}, origin="https://evil.example")
    assert code == 403
    assert m.state()["queue"] == []
