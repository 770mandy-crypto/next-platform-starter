// Tiny synthesized sound effects, so the game needs no audio files.
export class Sfx {
    constructor() {
        this.ctx = null;
        this.volume = 0.5;
        this.muted = false;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            const len = this.ctx.sampleRate * 0.5;
            this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noise.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch {
            this.ctx = null;
        }
    }

    resume() {
        if (this.ctx?.state === 'suspended') this.ctx.resume();
    }

    gain(v) {
        const g = this.ctx.createGain();
        g.gain.value = v * this.volume;
        g.connect(this.ctx.destination);
        return g;
    }

    burst(vol, dur, freq, q = 1, type = 'lowpass') {
        if (!this.ctx || this.muted || vol < 0.01) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noise;
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = this.gain(vol);
        g.gain.setValueAtTime(vol * this.volume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f);
        f.connect(g);
        src.start(t);
        src.stop(t + dur);
    }

    tone(vol, dur, f0, f1, type = 'sine', delay = 0) {
        if (!this.ctx || this.muted || vol < 0.01) return;
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        const g = this.gain(vol);
        g.gain.setValueAtTime(vol * this.volume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        o.start(t);
        o.stop(t + dur);
    }

    shot(type, dist = 0) {
        const v = Math.max(0, 1 - dist / 220);
        if (type === 'shotgun') this.burst(0.9 * v, 0.35, 1400, 0.7);
        else if (type === 'sniper') {
            this.burst(1 * v, 0.6, 2200, 0.5);
            this.tone(0.3 * v, 0.3, 160, 40, 'sawtooth');
        } else if (type === 'smg') this.burst(0.35 * v, 0.09, 3200, 0.8);
        else if (type === 'pistol') this.burst(0.5 * v, 0.14, 2600, 0.8);
        else this.burst(0.55 * v, 0.16, 2000, 0.8);
    }

    hit(head) {
        this.tone(0.25, 0.08, head ? 1800 : 1200, head ? 2400 : 900, 'square');
    }

    pick() {
        this.burst(0.35, 0.12, 900, 3, 'bandpass');
    }

    build() {
        this.tone(0.25, 0.12, 300, 120, 'triangle');
        this.burst(0.2, 0.1, 600, 2, 'bandpass');
    }

    pickup() {
        this.tone(0.2, 0.1, 600, 900, 'triangle');
        this.tone(0.2, 0.12, 900, 1300, 'triangle', 0.07);
    }

    chest() {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(0.18, 0.25, f, f, 'triangle', i * 0.08));
    }

    reload() {
        this.burst(0.2, 0.06, 4000, 4, 'bandpass');
    }

    elim() {
        this.tone(0.3, 0.25, 880, 440, 'square');
    }

    victory() {
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(0.25, 0.4, f, f, 'triangle', i * 0.15));
    }

    hurt() {
        this.tone(0.25, 0.15, 220, 110, 'sawtooth');
    }
}
