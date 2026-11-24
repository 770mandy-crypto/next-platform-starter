"""Fake pyautogui/pyperclip so tests run without a screen and never move your mouse."""
import sys
import types
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class FakeGUI(types.ModuleType):
    class FailSafeException(Exception):
        pass

    def __init__(self):
        super().__init__("pyautogui")
        self.calls = []
        self.FAILSAFE = True
        self.PAUSE = 0
        self.screen = (1920, 1080)
        self.capture = (3840, 2160)  # HiDPI capture

    def size(self):
        return self.screen

    def screenshot(self):
        return Image.new("RGB", self.capture, (40, 90, 160))

    def position(self):
        return (960, 540)

    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return lambda *a, **k: self.calls.append((name, a, k))


class FakeClipboard(types.ModuleType):
    def __init__(self):
        super().__init__("pyperclip")
        self.value = "previous clipboard"
        self.history = []

    def copy(self, text):
        self.value = text
        self.history.append(text)

    def paste(self):
        return self.value


GUI = FakeGUI()
CLIP = FakeClipboard()
sys.modules["pyautogui"] = GUI
sys.modules["pyperclip"] = CLIP


@pytest.fixture
def gui():
    GUI.calls.clear()
    return GUI


@pytest.fixture
def clip():
    CLIP.history.clear()
    CLIP.value = "previous clipboard"
    return CLIP
