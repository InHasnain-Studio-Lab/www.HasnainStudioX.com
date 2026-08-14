/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — fluid.js
   Quiet cosmic dust only. The wind ribbons were retired so the night
   sky (stars + moon in effects.js) owns the background.
   Pauses when the tab is hidden; off for reduced motion.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'fluid-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W, H, DPR;
    var mobile = window.matchMedia('(max-width: 760px)').matches;

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 1.75);
        W = canvas.width = Math.floor(innerWidth * DPR);
        H = canvas.height = Math.floor(innerHeight * DPR);
        canvas.style.width = innerWidth + 'px';
        canvas.style.height = innerHeight + 'px';
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    var PALETTE = [
        [242, 223, 184],
        [243, 179, 207],
        [199, 165, 247],
        [159, 232, 214],
        [188, 217, 244]
    ];

    var DUST = mobile ? 14 : 26;
    var dust = [];
    for (var d = 0; d < DUST; d++) {
        dust.push({
            x: Math.random(), y: Math.random(),
            r: 0.5 + Math.random() * 1.3,
            vx: (Math.random() - 0.5) * 0.00005,
            vy: -0.00002 - Math.random() * 0.00005,
            tw: Math.random() * Math.PI * 2,
            c: PALETTE[(Math.random() * PALETTE.length) | 0]
        });
    }

    var running = true;
    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) requestAnimationFrame(frame);
    });

    function frame(t) {
        if (!running) return;
        ctx.clearRect(0, 0, W, H);
        for (var k = 0; k < dust.length; k++) {
            var p = dust[k];
            p.x += p.vx * 16; p.y += p.vy * 16;
            if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
            if (p.x < -0.02) { p.x = 1.02; }
            if (p.x > 1.02) { p.x = -0.02; }
            var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.0011 + p.tw));
            ctx.beginPath();
            ctx.arc(p.x * W, p.y * H, p.r * DPR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + (0.22 * tw).toFixed(3) + ')';
            ctx.fill();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
