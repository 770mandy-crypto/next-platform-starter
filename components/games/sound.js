'use client';

const STORAGE_KEY = 'games:muted';

let audioCtx = null;
let muted = false;
let restored = false;
const listeners = new Set();

function restore() {
    if (restored || typeof window === 'undefined') return;
    restored = true;
    muted = window.localStorage.getItem(STORAGE_KEY) === '1';
}

/** Must be called from a user gesture — browsers block audio before one. */
export function initAudio() {
    if (typeof window === 'undefined') return;
    restore();
    if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        audioCtx = new AudioCtor();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function isMuted() {
    restore();
    return muted;
}

export function setMuted(value) {
    restore();
    muted = value;
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    for (const listener of listeners) listener();
}

export function subscribeMuted(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function tone({ freq, to = freq, dur = 0.12, type = 'square', gain = 0.05, delay = 0 }) {
    if (!audioCtx || isMuted()) return;
    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + dur);

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(amp).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
}

export const sfx = {
    shoot: () => tone({ freq: 720, to: 260, dur: 0.08, type: 'square', gain: 0.03 }),
    hit: () => tone({ freq: 320, to: 110, dur: 0.12, type: 'sawtooth', gain: 0.04 }),
    pop: () => tone({ freq: 620, to: 900, dur: 0.09, type: 'triangle', gain: 0.05 }),
    explode: () => {
        tone({ freq: 180, to: 40, dur: 0.3, type: 'sawtooth', gain: 0.06 });
        tone({ freq: 90, to: 30, dur: 0.35, type: 'square', gain: 0.04, delay: 0.02 });
    },
    miss: () => tone({ freq: 180, to: 120, dur: 0.1, type: 'sine', gain: 0.04 }),
    levelUp: () => {
        tone({ freq: 520, dur: 0.09, type: 'triangle', gain: 0.05 });
        tone({ freq: 780, dur: 0.09, type: 'triangle', gain: 0.05, delay: 0.09 });
        tone({ freq: 1040, dur: 0.14, type: 'triangle', gain: 0.05, delay: 0.18 });
    },
    gameOver: () => {
        tone({ freq: 400, dur: 0.18, type: 'square', gain: 0.05 });
        tone({ freq: 300, dur: 0.18, type: 'square', gain: 0.05, delay: 0.16 });
        tone({ freq: 180, to: 90, dur: 0.4, type: 'square', gain: 0.05, delay: 0.32 });
    }
};
