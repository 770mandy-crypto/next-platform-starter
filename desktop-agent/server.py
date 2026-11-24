"""
Dashboard mode: runs the desktop agent with a local web control panel,
a 3D avatar, voice conversation and clap-to-wake.

    python server.py            # opens http://localhost:8765
    python server.py --no-clap  # without the microphone clap listener

Clap twice to bring the dashboard up and start listening.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import anthropic

import agent
from agent import EVENTS, TaskManager, log

HERE = Path(__file__).resolve().parent
DASHBOARD = HERE / "dashboard" / "index.html"


class State:
    def __init__(self, manager: TaskManager, args) -> None:
        self.manager = manager
        self.args = args
        self.wake_seq = 0          # bumps on every double clap
        self.clap = {"enabled": False, "status": "off", "level": 0.0}
        self.last_open = 0.0
        self.last_poll = 0.0       # when a dashboard last polled

    def wake(self) -> None:
        self.wake_seq += 1
        log("wake", "👏👏 Double clap detected - waking up.")
        # Open the dashboard if no browser tab has polled recently.
        if time.time() - self.last_poll > 3 and time.time() - self.last_open > 10:
            self.last_open = time.time()
            webbrowser.open(f"http://localhost:{self.args.port}/?wake=1")


def system_check() -> list[dict]:
    """Quick checks that the agent can actually work on this computer."""
    checks = []

    def add(name, ok, detail=""):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    add("Python", True, platform.python_version())
    add("Operating system", True, f"{platform.system()} {platform.release()}")
    key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    add("API key set", key, "" if key else "set ANTHROPIC_API_KEY (see README)")
    try:
        w, h = agent.pyautogui.size()
        add("Screen size", True, f"{w}x{h}")
    except Exception as e:
        add("Screen size", False, str(e))
    try:
        img = agent.pyautogui.screenshot()
        # A fully black capture usually means no Screen Recording permission (macOS).
        extrema = img.convert("L").getextrema()
        ok = extrema != (0, 0)
        add("Screenshot", ok, f"{img.size[0]}x{img.size[1]}" if ok else
            "screenshot is black - allow Screen Recording for the terminal")
    except Exception as e:
        add("Screenshot", False, str(e))
    try:
        x, y = agent.pyautogui.position()
        add("Mouse access", True, f"cursor at {x},{y}")
    except Exception as e:
        add("Mouse access", False, str(e))
    add("Hebrew typing (pyperclip)", agent.pyperclip is not None,
        "" if agent.pyperclip else "pip install pyperclip")
    add("F12 emergency stop (pynput)", agent.pynput_keyboard is not None,
        "" if agent.pynput_keyboard else "pip install pynput")
    try:
        import clap
        add("Microphone (clap)", *clap.check_microphone())
    except Exception as e:
        add("Microphone (clap)", False, str(e))
    if key:
        try:
            client = anthropic.Anthropic()
            r = client.messages.create(model=agent.MODEL, max_tokens=64,
                                       output_config={"effort": "low"},
                                       messages=[{"role": "user", "content": "Reply with just: OK"}])
            text = "".join(b.text for b in r.content if b.type == "text").strip()
            add("Claude API", True, f"{agent.MODEL}: {text[:40]}")
        except anthropic.AuthenticationError:
            add("Claude API", False, "the API key was rejected")
        except anthropic.APIError as e:
            add("Claude API", False, str(e)[:200])
    else:
        add("Claude API", False, "no API key")
    return checks


def make_handler(state: State):
    m = state.manager

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):  # keep the terminal clean
            pass

        def _send(self, code: int, body, ctype="application/json") -> None:
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype + "; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _json(self) -> dict:
            n = int(self.headers.get("Content-Length") or 0)
            try:
                return json.loads(self.rfile.read(n) or b"{}")
            except json.JSONDecodeError:
                return {}

        def _local_only(self) -> bool:
            # Refuse requests from other web pages (simple CSRF guard).
            origin = self.headers.get("Origin")
            allowed = {f"http://localhost:{state.args.port}", f"http://127.0.0.1:{state.args.port}"}
            if origin and origin not in allowed:
                self._send(403, {"error": "forbidden"})
                return False
            return True

        def do_GET(self):
            path = self.path.split("?")[0]
            if path in ("/", "/index.html"):
                head = (b'<!doctype html><html lang="he"><meta charset="utf-8">'
                        b'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
                self._send(200, head + DASHBOARD.read_bytes(), "text/html")
            elif path == "/vendor/three.min.js":
                self._send(200, (DASHBOARD.parent / "vendor" / "three.min.js").read_bytes(), "text/javascript")
            elif path == "/api/state":
                state.last_poll = time.time()
                since = int((self.path.split("since=")[1:] or ["0"])[0].split("&")[0] or 0)
                self._send(200, {
                    **m.state(),
                    "events": EVENTS.since(since),
                    "wake": state.wake_seq,
                    "clap": state.clap,
                    "model": agent.MODEL,
                    "connected": True,
                })
            elif path == "/api/check":
                self._send(200, {"checks": system_check()})
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self):
            if not self._local_only():
                return
            path = self.path.split("?")[0]
            body = self._json()
            if path == "/api/task":
                text = (body.get("text") or "").strip()
                if not text:
                    return self._send(400, {"error": "empty task"})
                t = m.add(text)
                log("info", f"Queued task #{t.id}: {text}", t.id)
                self._send(200, {"id": t.id})
            elif path == "/api/stop":
                t = m.stop_current()
                self._send(200, {"stopped": t.id if t else None})
            elif path.startswith("/api/cancel/"):
                self._send(200, {"message": m.cancel(int(path.rsplit("/", 1)[1]))})
            elif path == "/api/clear":
                self._send(200, {"cleared": m.clear()})
            elif path == "/api/confirm":
                m.confirm_answers.put("y" if body.get("allow") else "n")
                self._send(200, {"ok": True})
            elif path == "/api/wake":  # test the wake-up without clapping
                state.wake()
                self._send(200, {"ok": True})
            else:
                self._send(404, {"error": "not found"})

    return Handler


def main() -> None:
    p = argparse.ArgumentParser(description="Claude desktop agent - dashboard mode")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--effort", default="medium", choices=["low", "medium", "high", "xhigh", "max"])
    p.add_argument("--max-steps", type=int, default=60)
    p.add_argument("--confirm", action="store_true", help="approve every action from the dashboard")
    p.add_argument("--keep-context", action="store_true")
    p.add_argument("--no-clap", action="store_true", help="disable clap-to-wake")
    p.add_argument("--clap-sensitivity", type=float, default=1.0,
                   help="higher = reacts to softer claps (try 0.5-2)")
    p.add_argument("--no-browser", action="store_true")
    args = p.parse_args()
    args.cli = False

    manager = TaskManager()
    state = State(manager, args)
    client = anthropic.Anthropic()
    threading.Thread(target=agent.worker, args=(client, manager, args), daemon=True).start()
    agent.start_hotkey(manager)

    if not args.no_clap:
        try:
            import clap
            clap.start(state.wake, state.clap, sensitivity=args.clap_sensitivity)
        except Exception as e:
            state.clap.update(status=f"unavailable: {e}")
            log("info", f"(clap detection unavailable: {e})")

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(state))
    url = f"http://localhost:{args.port}"
    log("info", f"Dashboard: {url}  (Ctrl+C to quit)")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        manager.clear()
        print("\nBye.")


if __name__ == "__main__":
    main()
