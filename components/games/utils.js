export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

export function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

export function circlesHit(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const r = a.r + b.r;
    return dx * dx + dy * dy <= r * r;
}

export function pointInCircle(point, circle) {
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
}

/** Sizes a canvas for the current device pixel ratio and returns its 2D context. */
export function fitCanvas(canvas, width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

/** Translates a pointer event into canvas coordinates. */
export function pointerPos(canvas, event, width, height) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * width,
        y: ((event.clientY - rect.top) / rect.height) * height
    };
}

export function spawnBurst(particles, x, y, color, count = 14, speed = 180) {
    for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const velocity = rand(speed * 0.3, speed);
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            r: rand(1.5, 4),
            life: rand(0.3, 0.8),
            maxLife: 0.8,
            color
        });
    }
}

export function updateParticles(particles, dt, gravity = 220) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += gravity * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

export function drawParticles(ctx, particles) {
    for (const p of particles) {
        ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}
