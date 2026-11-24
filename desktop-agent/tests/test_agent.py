import threading
import types

import pytest

import agent


def block(name, inp=None, id="t1"):
    return types.SimpleNamespace(type="tool_use", name=name, input=inp or {}, id=id)


def run(blocks, cancel=None, confirm=None):
    return agent.process_tool_calls(blocks, agent.Screen(), cancel or threading.Event(), confirm)


# --- image limits and coordinates ---------------------------------------

@pytest.mark.parametrize("w,h", [(1920, 1080), (2560, 1440), (3840, 2160), (1366, 768), (1080, 1920), (800, 600)])
def test_screenshot_size_fits_model_limits(w, h):
    sw, sh = agent.fit_size(w, h)
    assert max(sw, sh) <= agent.MAX_LONG_EDGE
    assert -(-sw // 28) * -(-sh // 28) <= agent.MAX_VISUAL_TOKENS
    assert abs(sw / sh - w / h) < 0.02


def test_coordinates_round_trip(gui):
    s = agent.Screen()
    for x, y in [(10, 10), (960, 540), (1900, 1070)]:
        ix, iy = s.to_image(x, y)
        sx, sy = s.to_screen([ix, iy])
        assert abs(sx - x) <= 2 and abs(sy - y) <= 2


def test_screenshot_is_scaled_png(gui):
    import base64, io
    from PIL import Image
    img = agent.Screen().screenshot()
    data = Image.open(io.BytesIO(base64.b64decode(img["source"]["data"])))
    assert data.size == agent.fit_size(*gui.screen)


# --- actions --------------------------------------------------------------

def test_click_maps_coordinates(gui):
    s = agent.Screen()
    res = run([block("left_click", {"coordinate": [s.img_w // 2, s.img_h // 2]})])
    assert res[0]["toolset_name"] == "computer" and not res[0].get("is_error")
    name, args, kw = gui.calls[-1]
    assert name == "click" and abs(args[0] - 960) <= 2 and abs(args[1] - 540) <= 2


def test_key_combo_aliases(gui):
    run([block("key", {"text": "ctrl+Return"})])
    assert gui.calls[-1] == ("hotkey", ("ctrl", "enter"), {})


def test_every_result_answers_every_block_and_halts_after_error(gui):
    blocks = [block("left_click", {"coordinate": [1, 1]}, "a"),
              block("not_a_real_action", {}, "b"),
              block("screenshot", {}, "c")]
    res = run(blocks)
    assert [r["tool_use_id"] for r in res] == ["a", "b", "c"]
    assert all(r["toolset_name"] == "computer" for r in res)
    assert res[1]["is_error"] and res[2]["content"][0]["text"] == agent.HALT_TEXT


def test_cancel_stops_remaining_actions(gui):
    cancel = threading.Event()
    cancel.set()
    res = run([block("left_click", {"coordinate": [1, 1]}, "a"), block("type", {"text": "x"}, "b")], cancel)
    assert all(r["content"][0]["text"] == agent.CANCELLED_TEXT for r in res)
    assert not gui.calls  # nothing touched the mouse or keyboard


def test_wait_is_interruptible(gui):
    import time
    cancel = threading.Event()
    threading.Timer(0.2, cancel.set).start()
    t0 = time.time()
    res = run([block("wait", {"duration": 30})], cancel)
    assert time.time() - t0 < 2
    assert res[0]["content"][0]["text"] == agent.CANCELLED_TEXT


def test_failsafe_cancels_task(gui, monkeypatch):
    def boom(*a, **k):
        raise gui.FailSafeException()
    monkeypatch.setattr(gui, "click", boom, raising=False)
    cancel = threading.Event()
    res = run([block("left_click", {"coordinate": [1, 1]})], cancel)
    assert cancel.is_set() and res[0]["is_error"]


def test_confirm_decline_halts(gui):
    res = run([block("left_click", {"coordinate": [1, 1]}, "a"), block("type", {"text": "x"}, "b")],
              confirm=lambda prompt, cancel: False)
    assert res[0]["is_error"] and res[1]["content"][0]["text"] == agent.HALT_TEXT
    assert not gui.calls


# --- Hebrew ---------------------------------------------------------------

HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת"
HEBREW_FINALS = "ךםןףץ"
PANGRAM = "דג סקרן שט בים מאוכזב ולפתע מצא חברה נאמנה"


def test_pangram_has_every_letter():
    assert set(HEBREW_LETTERS) <= set(PANGRAM)


@pytest.mark.parametrize("text", [
    HEBREW_LETTERS, HEBREW_FINALS, PANGRAM,
    "שָׁלוֹם עוֹלָם",                     # with niqqud
    "תפתח את Chrome ותחפש 'מזג אוויר'",   # mixed Hebrew/English
    "מחיר: ₪120, הנחה 15%!",              # symbols and numbers
])
def test_hebrew_is_typed_exactly(gui, clip, text):
    res = run([block("type", {"text": text})])
    assert not res[0].get("is_error")
    assert text in clip.history               # pasted character-for-character
    assert any(c[0] == "hotkey" and c[1][-1] == "v" for c in gui.calls)
    assert clip.value == "previous clipboard"  # user's clipboard restored


def test_each_hebrew_letter_individually(gui, clip):
    for ch in HEBREW_LETTERS + HEBREW_FINALS:
        run([block("type", {"text": ch})])
    assert [h for h in clip.history if h != "previous clipboard"] == list(HEBREW_LETTERS + HEBREW_FINALS)


def test_ascii_is_typed_directly(gui, clip):
    run([block("type", {"text": "hello"})])
    assert ("write", ("hello",), {"interval": 0.01}) in gui.calls
    assert not clip.history


def test_system_prompt_asks_for_hebrew_replies():
    assert "Hebrew" in agent.SYSTEM_PROMPT


# --- task queue and cancellation -------------------------------------------

def test_task_queue_cancel_and_clear():
    m = agent.TaskManager()
    a, b, c = m.add("א"), m.add("ב"), m.add("ג")
    assert "removed" in m.cancel(b.id)
    cur = m.next()
    assert cur is a and cur.status == "running"
    assert "Stopping" in m.cancel(a.id) and a.cancel.is_set()
    m.done("cancelled")
    assert m.clear() == 1
    st = m.state()
    assert st["current"] is None and st["queue"] == []
    assert {t["status"] for t in st["finished"]} == {"cancelled"}


def test_confirm_answer_via_queue():
    m = agent.TaskManager()
    threading.Timer(0.1, lambda: m.confirm_answers.put("לא")).start()
    assert m.ask_confirm("ok? ", threading.Event()) is False
    threading.Timer(0.1, lambda: m.confirm_answers.put("")).start()
    assert m.ask_confirm("ok? ", threading.Event()) is True
