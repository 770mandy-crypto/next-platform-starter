import numpy as np

from clap import BLOCK, SAMPLE_RATE, ClapDetector

rng = np.random.default_rng(0)


def noise(level=0.005):
    return rng.normal(0, level, BLOCK).astype(np.float32)


def clap_block():
    x = noise()
    x[:60] += np.exp(-np.arange(60) / 10) * 0.9 * rng.choice([-1, 1], 60)
    return x


def feed(det, pattern):
    """pattern: list of (seconds, 'n'|'c'). Returns number of wake-ups."""
    hits, t = [], 0.0
    det.on_double_clap = lambda: hits.append(t)
    for dur, kind in pattern:
        for _ in range(int(dur * SAMPLE_RATE / BLOCK)):
            det.feed(clap_block() if kind == "c" else noise(), now=t)
            t += BLOCK / SAMPLE_RATE
            kind = "n" if kind == "c" else kind  # a clap is one block
    return len(hits)


def test_double_clap_wakes():
    d = ClapDetector(lambda: None)
    assert feed(d, [(2, "n"), (0.02, "c"), (0.35, "n"), (0.02, "c"), (1, "n")]) == 1


def test_single_clap_does_not_wake():
    d = ClapDetector(lambda: None)
    assert feed(d, [(2, "n"), (0.02, "c"), (2, "n")]) == 0


def test_claps_too_far_apart_do_not_wake():
    d = ClapDetector(lambda: None)
    assert feed(d, [(2, "n"), (0.02, "c"), (1.5, "n"), (0.02, "c"), (1, "n")]) == 0


def test_steady_loud_sound_does_not_wake():
    d = ClapDetector(lambda: None)
    hits = []
    d.on_double_clap = lambda: hits.append(1)
    t = 0.0
    for _ in range(200):  # 4 s of loud music-like noise
        d.feed(noise(0.2), now=t)
        t += 0.02
    assert not hits
