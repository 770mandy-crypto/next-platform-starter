"""
Double-clap detection from the microphone.

A clap is a short, sharp sound: the peak jumps far above the recent
background level and fades within ~100 ms. Two claps 0.15-0.8 s apart
trigger the callback.
"""

from __future__ import annotations

import threading
import time

import numpy as np

SAMPLE_RATE = 16000
BLOCK = 320  # 20 ms


class ClapDetector:
    def __init__(self, on_double_clap, sensitivity: float = 1.0) -> None:
        self.on_double_clap = on_double_clap
        self.sensitivity = max(0.1, sensitivity)
        self.background = 0.01   # running RMS of the room
        self.last_clap = 0.0
        self.refractory_until = 0.0
        self.cooldown_until = 0.0
        self.level = 0.0

    def feed(self, samples: np.ndarray, now: float | None = None) -> bool:
        """Process one block of float samples in [-1, 1]. Returns True on a double clap."""
        now = time.monotonic() if now is None else now
        samples = samples.astype(np.float32).ravel()
        if samples.size == 0:
            return False
        peak = float(np.max(np.abs(samples)))
        rms = float(np.sqrt(np.mean(samples ** 2)))
        self.level = peak

        threshold_ratio = 6.0 / self.sensitivity
        min_peak = 0.25 / self.sensitivity
        is_clap = (
            now >= self.refractory_until
            and peak >= min_peak
            and peak >= self.background * threshold_ratio * 3
            and rms >= self.background * threshold_ratio
        )
        # Update the background slowly, and never with the clap itself.
        if not is_clap:
            self.background = 0.97 * self.background + 0.03 * max(rms, 0.002)

        if not is_clap:
            return False
        self.refractory_until = now + 0.12  # ignore the clap's own tail
        gap = now - self.last_clap
        self.last_clap = now
        if 0.15 <= gap <= 0.8 and now >= self.cooldown_until:
            self.cooldown_until = now + 2.0
            self.last_clap = 0.0
            self.on_double_clap()
            return True
        return False


def check_microphone() -> tuple[bool, str]:
    import sounddevice as sd
    dev = sd.query_devices(kind="input")
    return True, dev["name"]


def start(on_double_clap, status: dict, sensitivity: float = 1.0) -> threading.Thread:
    """Listen on the default microphone in a background thread."""
    import sounddevice as sd

    detector = ClapDetector(on_double_clap, sensitivity)
    status.update(enabled=True, status="listening")

    def run():
        def callback(indata, frames, t, flags):
            detector.feed(indata[:, 0])
            status["level"] = round(detector.level, 3)

        while True:
            try:
                with sd.InputStream(channels=1, samplerate=SAMPLE_RATE,
                                    blocksize=BLOCK, callback=callback):
                    status["status"] = "listening"
                    while True:
                        time.sleep(1)
            except Exception as e:  # mic unplugged / busy: retry
                status["status"] = f"microphone error: {e}"
                time.sleep(5)

    th = threading.Thread(target=run, daemon=True)
    th.start()
    return th
