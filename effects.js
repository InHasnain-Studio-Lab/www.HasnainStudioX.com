/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — effects.js
   Atmosphere: cursor light-aura, card spotlight tracking, 3D card tilt,
   orb parallax. Desktop / fine-pointer only; honours reduced motion.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduceMotion || !finePointer) return;

    /* ── Cursor aura: soft iridescent light following the pointer ──────── */
    var aura = document.createElement('div');
    aura.id = 'cursor-aura';
    document.body.appendChild(aura);
    var ax = innerWidth / 2, ay = innerHeight / 3, tx = ax, ty = ay;
    document.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    (function loop() {
        ax += (tx - ax) * 0.085;
        ay += (ty - ay) * 0.085;
        aura.style.transform = 'translate(' + (ax - 190) + 'px,' + (ay - 190) + 'px)';
        requestAnimationFrame(loop);
    })();

    /* ── Orb parallax: light-fields lean toward the pointer ────────────── */
    var orbs = document.querySelectorAll('.orb');
    if (orbs.length) {
        document.addEventListener('pointermove', function (e) {
            var nx = (e.clientX / innerWidth - 0.5);
            var ny = (e.clientY / innerHeight - 0.5);
            orbs.forEach(function (o, i) {
                var depth = (i + 1) * 14;
                o.style.setProperty('--px', (nx * depth) + 'px');
                o.style.setProperty('--py', (ny * depth) + 'px');
            });
        }, { passive: true });
    }

    /* ── Card spotlight + 3D tilt ───────────────────────────────────────── */
    var tiltables = document.querySelectorAll('.card, .contact-info-card, .app-tile, .stat-item, .hero-card, .about-strip');
    tiltables.forEach(function (el) {
        var isBig = el.classList.contains('hero-card') || el.classList.contains('about-strip');
        var maxTilt = isBig ? 1.6 : 4.5;
        el.addEventListener('pointermove', function (e) {
            var r = el.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width;
            var py = (e.clientY - r.top) / r.height;
            el.style.setProperty('--mx', (px * 100) + '%');
            el.style.setProperty('--my', (py * 100) + '%');
            if (el.classList.contains('stat-item')) return;
            var rx = (0.5 - py) * maxTilt;
            var ry = (px - 0.5) * maxTilt;
            el.style.transform =
                'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)' +
                (isBig ? '' : ' translateY(-6px)');
        });
        el.addEventListener('pointerleave', function () {
            el.style.transform = '';
        });
    });

    /* ── Depth stage: whole hero composition leans in 3D toward pointer ── */
    document.querySelectorAll('.depth-stage').forEach(function (stage) {
        stage.addEventListener('pointermove', function (e) {
            var r = stage.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width - 0.5;
            var py = (e.clientY - r.top) / r.height - 0.5;
            stage.style.transform =
                'perspective(1200px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 7).toFixed(2) + 'deg)';
        });
        stage.addEventListener('pointerleave', function () {
            stage.style.transform = '';
        });
    });
})();

/* ═══════════════════════════════════════════════════════════════════════
   SIGNATURE EFFECTS — ported from the previous InHasnain build and
   restyled for the obsidian palette. Honest by design: no fabricated
   content, silent if audio files are absent, reduced-motion respected.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TOUCH = window.matchMedia('(hover:none),(pointer:coarse)').matches;
    function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }

    /* permanent night: the obsidian theme is the night theme */
    document.body.classList.add('is-night');

    /* ── Header tools: weather toggle, ambient sound, live clock ───────── */
    function initHeaderTools() {
        var bar = document.querySelector('.top-bar');
        if (!bar || bar.querySelector('.actions')) return;
        var actions = document.createElement('div');
        actions.className = 'actions';
        actions.setAttribute('role', 'group');
        actions.setAttribute('aria-label', 'Site controls');
        bar.appendChild(actions);

        /* weather: clear / cinematic rain */
        var wxBtn = document.createElement('button');
        wxBtn.className = 'tool-btn wx-btn';
        wxBtn.title = 'Toggle rain / clear';
        window.__weather = localStorage.getItem('hsx-weather') || 'clear';
        function syncWx() {
            document.body.classList.toggle('weather-rain', window.__weather === 'rain');
            document.body.classList.toggle('weather-clear', window.__weather === 'clear');
        }
        function paintWx() {
            wxBtn.innerHTML = window.__weather === 'rain'
                ? '<span class="ico">&#9730;</span><span class="lbl">RAIN</span>'
                : '<span class="ico">&#10022;</span><span class="lbl">CLEAR</span>';
            syncWx();
        }
        paintWx();
        wxBtn.addEventListener('click', function () {
            window.__weather = window.__weather === 'rain' ? 'clear' : 'rain';
            localStorage.setItem('hsx-weather', window.__weather);
            paintWx();
            if (window.__applyWeatherAudio) window.__applyWeatherAudio();
            if (window.__setRain) window.__setRain(window.__weather === 'rain');
        });
        actions.appendChild(wxBtn);

        /* ambient sound (wired below; silent if audio files are absent) */
        var sndBtn = document.createElement('button');
        sndBtn.className = 'tool-btn snd-btn';
        sndBtn.title = 'Ambient sound';
        sndBtn.innerHTML = '<span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="lbl">SOUND</span>';
        actions.appendChild(sndBtn);

        /* night-sky toggle (stars + moon on/off) */
        var skyBtn = document.createElement('button');
        skyBtn.className = 'tool-btn sky-btn';
        skyBtn.title = 'Toggle night sky (stars and moon)';
        window.__skyOn = localStorage.getItem('hsx-sky') !== 'off';
        function paintSky() {
            skyBtn.innerHTML = window.__skyOn
                ? '<span class="ico">&#10038;</span><span class="lbl">SKY ON</span>'
                : '<span class="ico">&#10038;</span><span class="lbl">SKY OFF</span>';
            skyBtn.classList.toggle('on', window.__skyOn);
            var cv = document.getElementById('star-canvas');
            if (cv) cv.classList.toggle('off', !window.__skyOn);
        }
        paintSky();
        skyBtn.addEventListener('click', function () {
            window.__skyOn = !window.__skyOn;
            localStorage.setItem('hsx-sky', window.__skyOn ? 'on' : 'off');
            paintSky();
        });
        actions.appendChild(skyBtn);
        window.__paintSky = paintSky;

        /* live clock */
        var clock = document.createElement('div');
        clock.className = 'clock';
        clock.innerHTML = '<span class="dot"></span><span class="time">--:--:--</span><span class="meridian">--</span>';
        actions.appendChild(clock);
        var tEl = clock.querySelector('.time'), mEl = clock.querySelector('.meridian');
        function pad(n) { return String(n).padStart(2, '0'); }
        function tick() {
            var d = new Date(), h = d.getHours(), mer = h >= 12 ? 'PM' : 'AM';
            h = h % 12; if (!h) h = 12;
            tEl.textContent = pad(h) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
            mEl.textContent = mer;
        }
        tick(); setInterval(tick, 1000);
    }

    /* ── Particle wordmark: HASNAIN STUDIO X in shimmering gold dust ───── */
    function initKineticWord() {
        if (document.querySelector('.kinetic-word')) return;
        var anchor = document.querySelector('.marquee');   /* home page only */
        if (!anchor) return;
        var wrap = document.createElement('div');
        wrap.className = 'kinetic-word'; wrap.setAttribute('aria-hidden', 'true');
        var canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        anchor.insertAdjacentElement('beforebegin', wrap);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        var particles = [];
        var TONES = ['#f2dfb8', '#e8cf8f', '#f3b3cf', '#c7a5f7', '#f3dd9e'];
        var TEXT = 'HASNAIN STUDIO X';
        function buildTargets() {
            var cssW = Math.min(wrap.clientWidth || 1100, 1400);
            var cssH = Math.round(cssW * 0.16);
            canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
            canvas.width = Math.round(cssW * DPR); canvas.height = Math.round(cssH * DPR);
            var off = document.createElement('canvas');
            off.width = canvas.width; off.height = canvas.height;
            var octx = off.getContext('2d');
            octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
            var pad = canvas.width * 0.06, maxW = canvas.width - pad * 2;
            var fontSize = Math.round(canvas.height * 0.62);
            octx.font = '800 ' + fontSize + "px 'Unbounded', sans-serif";
            var measured = octx.measureText(TEXT).width;
            if (measured > maxW) {
                fontSize = Math.floor(fontSize * (maxW / measured));
                octx.font = '800 ' + fontSize + "px 'Unbounded', sans-serif";
            }
            octx.fillText(TEXT, canvas.width / 2, canvas.height / 2);
            var data = octx.getImageData(0, 0, canvas.width, canvas.height).data;
            var step = Math.max(2, Math.round(2.6 * DPR));
            var targets = [];
            for (var y = 0; y < canvas.height; y += step) {
                for (var x = 0; x < canvas.width; x += step) {
                    if (data[(y * canvas.width + x) * 4 + 3] > 128) targets.push({ x: x, y: y });
                }
            }
            if (particles.length > targets.length) particles.length = targets.length;
            for (var i = 0; i < targets.length; i++) {
                if (particles[i]) { particles[i].tx = targets[i].x; particles[i].ty = targets[i].y; }
                else {
                    particles.push({
                        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                        tx: targets[i].x, ty: targets[i].y,
                        c: TONES[(Math.random() * TONES.length) | 0],
                        r: (0.7 + Math.random() * 1.1) * DPR,
                        ph: Math.random() * Math.PI * 2,
                        sp: 0.06 + Math.random() * 0.06
                    });
                }
            }
        }
        var t = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            t += 0.03;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (RM) { p.x = p.tx; p.y = p.ty; }
                else { p.x += (p.tx - p.x) * p.sp; p.y += (p.ty - p.y) * p.sp; }
                var tw = 0.55 + 0.45 * Math.sin(t + p.ph);
                ctx.globalAlpha = tw;
                ctx.fillStyle = p.c;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (0.7 + 0.5 * tw), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (!RM) requestAnimationFrame(draw);
        }
        buildTargets();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTargets);
        var rT;
        window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(buildTargets, 200); }, { passive: true });
        if (RM) { draw(); } else { requestAnimationFrame(draw); }
    }

    /* ── Signature intro: handwritten HASNAIN, once per session ────────── */
    function initSignature() {
        if (RM) return;
        if (sessionStorage.getItem('hsx-sig-seen')) return;
        sessionStorage.setItem('hsx-sig-seen', '1');
        var LETTERS = [
            { d: 'M 18,28 C 18,68 17,122 18,165 M 18,97 C 38,86 60,86 82,97 M 82,28 C 82,68 82,122 82,165', delay: 0 },
            { d: 'M 82,165 C 96,165 108,158 114,144', delay: 260 },
            { d: 'M 114,144 C 124,118 132,72 138,28 L 166,144 C 172,158 182,165 196,165', delay: 380 },
            { d: 'M 118,112 C 138,106 158,106 164,112', delay: 680 },
            { d: 'M 268,78 C 268,50 246,36 228,52 C 210,68 222,104 248,118 C 272,130 268,155 250,164 C 232,172 208,164 204,150', delay: 900 },
            { d: 'M 204,165 L 204,28', delay: 1180 },
            { d: 'M 204,28 C 212,28 220,46 230,68 L 272,155 C 274,160 276,165 278,165 L 278,28', delay: 1320 },
            { d: 'M 278,165 C 292,165 304,158 310,144', delay: 1580 },
            { d: 'M 310,144 C 320,118 330,72 336,28 L 364,144 C 370,158 380,165 394,165', delay: 1700 },
            { d: 'M 316,112 C 336,106 356,106 362,112', delay: 2000 },
            { d: 'M 432,28 C 430,70 430,124 432,165', delay: 2160 },
            { d: 'M 470,165 L 470,28', delay: 2360 },
            { d: 'M 470,28 C 478,28 486,46 496,68 L 538,155 C 540,160 542,165 544,165 L 544,28', delay: 2500 },
            { d: 'M 18,182 C 120,196 300,198 544,186', delay: 2780 }
        ];
        var TOTAL = 3200;
        var overlay = document.createElement('div');
        overlay.className = 'sig-overlay signing';
        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 580 210'); svg.setAttribute('aria-hidden', 'true');
        var tag = document.createElement('div');
        tag.className = 'sig-tag'; tag.textContent = 'Hasnain Studio X';
        overlay.appendChild(svg); overlay.appendChild(tag);
        document.body.appendChild(overlay);
        LETTERS.forEach(function (letter) {
            var path = document.createElementNS(NS, 'path');
            path.setAttribute('d', letter.d);
            path.setAttribute('class', 'sig-path');
            svg.appendChild(path);
            var len = path.getTotalLength() + 2;
            path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
            setTimeout(function () {
                path.style.transition = 'stroke-dashoffset ' + Math.max(180, len * 1.8) + 'ms cubic-bezier(.4,0,.2,1)';
                path.style.strokeDashoffset = '0';
            }, letter.delay);
        });
        setTimeout(function () {
            overlay.classList.add('done');
            setTimeout(function () { overlay.remove(); }, 950);
        }, TOTAL);
    }

    /* ── Custom cursor + iridescent snake trail (desktop) ──────────────── */
    function initCursor() {
        if (TOUCH || RM) return;
        var dot = document.createElement('div');
        dot.id = 'hsx-cursor'; document.body.appendChild(dot);
        var SEG = 16, trail = [];
        for (var i = 0; i < SEG; i++) {
            var el = document.createElement('div');
            el.className = 'hsx-snake-dot';
            var ratio = 1 - i / SEG;
            var size = Math.max(1.5, 7 * ratio * ratio);
            el.style.cssText = 'width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;opacity:' + (ratio * 0.45).toFixed(2) + ';';
            document.body.appendChild(el);
            trail.push({ el: el, x: -999, y: -999 });
        }
        var mx = -999, my = -999;
        document.addEventListener('mousemove', function (e) {
            mx = e.clientX; my = e.clientY;
            dot.style.left = mx + 'px'; dot.style.top = my + 'px';
        }, { passive: true });
        document.addEventListener('mousedown', function () { dot.classList.add('clicking'); });
        document.addEventListener('mouseup', function () { dot.classList.remove('clicking'); });
        var L = 0.28;
        (function animate() {
            trail[0].x += (mx - trail[0].x) * L; trail[0].y += (my - trail[0].y) * L;
            trail[0].el.style.left = trail[0].x + 'px'; trail[0].el.style.top = trail[0].y + 'px';
            for (var i = 1; i < SEG; i++) {
                trail[i].x += (trail[i - 1].x - trail[i].x) * L;
                trail[i].y += (trail[i - 1].y - trail[i].y) * L;
                trail[i].el.style.left = trail[i].x + 'px';
                trail[i].el.style.top = trail[i].y + 'px';
            }
            requestAnimationFrame(animate);
        })();
    }

    /* ── Shooting stars across the obsidian sky ────────────────────────── */
    function initStars() {
        if (RM) return;
        function spawn() {
            if (window.__skyOn === false) return;
            var star = document.createElement('div');
            star.className = 'shoot-star';
            var sx = 5 + Math.random() * 88, sy = 1 + Math.random() * 55;
            var len = 55 + Math.random() * 130, ang = 15 + Math.random() * 38;
            var dur = (0.38 + Math.random() * 0.65).toFixed(2), dist = 100 + Math.random() * 240;
            var rad = ang * Math.PI / 180;
            star.style.cssText = ['left:' + sx + 'vw', 'top:' + sy + 'vh', '--len:' + len + 'px', '--ang:' + ang + 'deg', '--dur:' + dur + 's', '--tx:' + (Math.cos(rad) * dist).toFixed(0) + 'px', '--ty:' + (Math.sin(rad) * dist).toFixed(0) + 'px'].join(';');
            document.body.appendChild(star);
            setTimeout(function () { star.remove(); }, parseFloat(dur) * 1000 + 120);
        }
        function chain(base) {
            setTimeout(function tick() {
                spawn();
                if (Math.random() < 0.25) setTimeout(spawn, 80 + Math.random() * 180);
                setTimeout(tick, 1400 + Math.random() * 2600);
            }, base);
        }
        chain(700); chain(2000);
    }

    /* ── Photoreal night sky: stars with true colour temperatures, a
          Milky Way band, diffraction spikes, and a cratered moon ────────── */
    function initStarfield() {
        var cv = document.createElement('canvas');
        cv.id = 'star-canvas'; cv.setAttribute('aria-hidden', 'true');
        var grid = document.querySelector('.bg-grid');
        if (grid) document.body.insertBefore(cv, grid); else document.body.prepend(cv);
        if (window.__skyOn === false) cv.classList.add('off');
        var ctx = cv.getContext('2d');
        if (!ctx) return;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        var W, H, stars = [], bright = [], t = 0;
        var moon = {}, craters = [], maria = [];
        /* real star colour temperatures: blue-white O/B, white A,
           yellow-white F/G, orange K, red-orange M */
        var TEMPS = ['#aac4ff', '#cfe0ff', '#ffffff', '#fff6e8', '#ffe9c9', '#ffd2a1'];
        function temp() {
            var r = Math.random();
            if (r < .12) return TEMPS[0];
            if (r < .28) return TEMPS[1];
            if (r < .62) return TEMPS[2];
            if (r < .82) return TEMPS[3];
            if (r < .95) return TEMPS[4];
            return TEMPS[5];
        }
        /* pre-rendered glow sprites: every star gets a soft immersive aura
           without per-frame gradient cost */
        var sprites = {};
        function hexA(hex, a) {
            var n = parseInt(hex.slice(1), 16);
            return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
        }
        function sprite(color) {
            if (sprites[color]) return sprites[color];
            var s = document.createElement('canvas');
            s.width = s.height = 64;
            var sc = s.getContext('2d');
            var g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.10, hexA(color, 0.9));
            g.addColorStop(0.28, hexA(color, 0.28));
            g.addColorStop(0.6, hexA(color, 0.07));
            g.addColorStop(1, hexA(color, 0));
            sc.fillStyle = g;
            sc.fillRect(0, 0, 64, 64);
            sprites[color] = s;
            return s;
        }
        function build() {
            W = cv.width = Math.round(innerWidth * DPR);
            H = cv.height = Math.round(innerHeight * DPR);
            cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
            var count = Math.min(440, Math.round(innerWidth * innerHeight / 4200));
            stars = []; bright = [];
            for (var i = 0; i < count; i++) {
                /* ~40% of stars cluster along a diagonal Milky Way band */
                var x, y;
                if (Math.random() < 0.4) {
                    var u = Math.random();
                    x = u * W;
                    var bandY = H * 0.72 - u * H * 0.5;
                    y = bandY + (Math.random() + Math.random() + Math.random() - 1.5) * H * 0.11;
                } else {
                    x = Math.random() * W; y = Math.random() * H;
                }
                var mag = Math.pow(Math.random(), 1.8);   /* most stars faint, few bright */
                stars.push({
                    x: x, y: y,
                    r: (0.3 + mag * 1.1) * DPR,
                    base: 0.18 + mag * 0.62,
                    sp: 0.3 + Math.random() * 1.6,
                    ph: Math.random() * Math.PI * 2,
                    c: temp()
                });
            }
            /* a handful of bright stars with glow + diffraction spikes */
            var nb = 7;
            for (var b = 0; b < nb; b++) {
                bright.push({
                    x: Math.random() * W, y: Math.random() * H * 0.85,
                    r: (1.5 + Math.random() * 1.1) * DPR,
                    sp: 0.2 + Math.random() * 0.5,
                    ph: Math.random() * Math.PI * 2,
                    c: temp()
                });
            }
            /* moon geometry + fixed surface features */
            moon.x = W * 0.82; moon.y = H * 0.19; moon.r = Math.min(W, H) * 0.065;
            /* designed surface: a few soft maria, six whisper-subtle craters */
            maria = []; craters = [];
            var M = [[-0.25, -0.12, 0.38, 0.30, 0.3], [0.20, -0.28, 0.26, 0.20, -0.4],
                     [0.05, 0.24, 0.30, 0.22, 0.15], [-0.38, 0.18, 0.18, 0.14, 0]];
            M.forEach(function (m) { maria.push({ dx: m[0], dy: m[1], rx: m[2], ry: m[3], rot: m[4] }); });
            var C = [[0.45, -0.35, 0.050], [-0.50, 0.42, 0.045], [0.30, 0.50, 0.058],
                     [-0.15, -0.50, 0.040], [0.60, 0.15, 0.035], [-0.60, -0.10, 0.048]];
            C.forEach(function (c) { craters.push({ dx: c[0], dy: c[1], cr: c[2] }); });
        }
        function drawMoon() {
            var x = moon.x, y = moon.y, r = moon.r;
            /* dreamy wide halo with a whisper of warmth */
            var halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 7);
            halo.addColorStop(0, 'rgba(228,234,252,0.18)');
            halo.addColorStop(0.25, 'rgba(238,236,228,0.07)');
            halo.addColorStop(0.6, 'rgba(220,228,250,0.025)');
            halo.addColorStop(1, 'rgba(220,228,250,0)');
            ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 7, 0, Math.PI * 2); ctx.fill();
            /* close moonlight bloom */
            var bloom = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.9);
            bloom.addColorStop(0, 'rgba(250,251,255,0.4)');
            bloom.addColorStop(1, 'rgba(250,251,255,0)');
            ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
            /* serene pearl disc, lit from upper left */
            var body = ctx.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.05, x, y, r * 1.02);
            body.addColorStop(0, '#ffffff');
            body.addColorStop(0.45, '#f2f0e9');
            body.addColorStop(0.82, '#dcdfe8');
            body.addColorStop(1, '#c2c8d8');
            ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            /* surface, clipped to the disc and kept whisper-subtle */
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
            maria.forEach(function (m) {
                ctx.save();
                ctx.translate(x + m.dx * r, y + m.dy * r);
                ctx.rotate(m.rot);
                var g = ctx.createRadialGradient(0, 0, 0, 0, 0, m.rx * r);
                g.addColorStop(0, 'rgba(108,116,140,0.16)');
                g.addColorStop(0.7, 'rgba(108,116,140,0.08)');
                g.addColorStop(1, 'rgba(108,116,140,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(0, 0, m.rx * r, m.ry * r, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
            craters.forEach(function (c) {
                var cx = x + c.dx * r, cy = y + c.dy * r, cr = c.cr * r;
                var bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                bowl.addColorStop(0, 'rgba(110,118,140,0.13)');
                bowl.addColorStop(0.8, 'rgba(110,118,140,0.05)');
                bowl.addColorStop(1, 'rgba(110,118,140,0)');
                ctx.fillStyle = bowl;
                ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
            });
            /* gentle limb shading so the sphere reads round */
            var limb = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.5, x, y, r);
            limb.addColorStop(0, 'rgba(30,34,52,0)');
            limb.addColorStop(0.85, 'rgba(30,34,52,0.04)');
            limb.addColorStop(1, 'rgba(30,34,52,0.22)');
            ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        function drawBright(s, tw) {
            /* layered aura */
            var R = s.r * 11;
            ctx.globalAlpha = tw * 0.85;
            ctx.drawImage(sprite(s.c), s.x - R, s.y - R, R * 2, R * 2);
            /* core */
            ctx.globalAlpha = tw;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            /* slender diffraction spikes */
            ctx.globalAlpha = tw * 0.4;
            ctx.strokeStyle = s.c; ctx.lineWidth = Math.max(1, s.r * 0.16);
            var L = s.r * (6 + tw * 3);
            ctx.beginPath();
            ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
            ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L);
            ctx.stroke();
        }
        function draw() {
            if (window.__skyOn === false) {
                ctx.clearRect(0, 0, W, H);
                if (!RM) requestAnimationFrame(draw);
                return;
            }
            ctx.clearRect(0, 0, W, H); t += 0.016;
            drawMoon();
            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                var tw = s.base * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
                /* immersive aura: each star drawn as a soft glow sprite */
                var R = s.r * 5.5;
                ctx.globalAlpha = Math.max(0.04, tw);
                ctx.drawImage(sprite(s.c), s.x - R, s.y - R, R * 2, R * 2);
            }
            for (var b = 0; b < bright.length; b++) {
                var bs = bright[b];
                drawBright(bs, 0.6 + 0.4 * Math.abs(Math.sin(t * bs.sp + bs.ph)));
            }
            ctx.globalAlpha = 1;
            if (!RM) requestAnimationFrame(draw);
        }
        build();
        var rT;
        window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(build, 200); }, { passive: true });
        if (RM) { draw(); } else { requestAnimationFrame(draw); }
        if (window.__paintSky) window.__paintSky();
    }

    /* ── Glass condensation: droplets on panels, visible in rain mode ──── */
    function initCondensation() {
        document.querySelectorAll('.hero-card, .card, .contact-info-card, .bento-cell, .float-card, .console, .contact-form').forEach(function (panel) {
            if (panel.querySelector(':scope > .glass-condensation')) return;
            var cond = document.createElement('div');
            cond.className = 'glass-condensation';
            var drops = [];
            var N = 9 + Math.floor(Math.random() * 5);
            for (var i = 0; i < N; i++) {
                var x = (Math.random() * 92 + 4).toFixed(1), y = (Math.random() * 92 + 4).toFixed(1);
                var r = (1 + Math.random() * 2.2).toFixed(1), a = (0.3 + Math.random() * 0.25).toFixed(2);
                drops.push('radial-gradient(circle ' + r + 'px at ' + x + '% ' + y + '%, rgba(255,255,255,' + a + ') 0%, rgba(255,255,255,' + (a * 0.4).toFixed(2) + ') 60%, transparent 100%)');
            }
            cond.style.backgroundImage = drops.join(',');
            if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';
            panel.insertBefore(cond, panel.firstChild);
        });
    }

    /* ── Waveform divider after the hero ───────────────────────────────── */
    function initWaveform() {
        var firstSection = document.querySelector('.section');
        if (!firstSection || document.querySelector('.waveform-divider')) return;
        var wrap = document.createElement('div');
        wrap.className = 'waveform-divider'; wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML = '<svg viewBox="0 0 1080 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path class="wf-back" d="M0 28 C90 8 180 48 270 28 S450 8 540 28 S720 48 810 28 S990 8 1080 28 V56 H0 Z"/>' +
            '<path class="wf-front" d="M0 32 C90 52 180 12 270 32 S450 52 540 32 S720 12 810 32 S990 52 1080 32 V56 H0 Z"/>' +
            '</svg>';
        firstSection.parentNode.insertBefore(wrap, firstSection);
    }

    /* ── Ink splat: click the brand for an ink burst, then home ────────── */
    function initInkSplat() {
        var brand = document.querySelector('.top-bar .brand');
        if (!brand) return;
        brand.style.cursor = 'pointer';
        var canvas = document.createElement('canvas');
        canvas.className = 'ink-splat-canvas';
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        resize(); window.addEventListener('resize', resize, { passive: true });
        function splat(cx, cy, cb) {
            canvas.classList.add('active');
            var color = '#efe9dc';
            var frame = 0;
            var drops = Array.from({ length: 28 }, function () { return { x: cx, y: cy, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 16 - Math.random() * 8, r: 4 + Math.random() * 12, life: 1, decay: 0.032 + Math.random() * 0.025, gravity: 0.45 }; });
            var blobs = Array.from({ length: 14 }, function () { return { x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 100, r: 3 + Math.random() * 18, life: 1, decay: 0.04 + Math.random() * 0.03 }; });
            (function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = color;
                var alive = false;
                drops.forEach(function (d) {
                    if (d.life <= 0) return; alive = true;
                    d.x += d.vx; d.y += d.vy; d.vy += d.gravity; d.vx *= 0.93; d.r *= 0.97; d.life -= d.decay;
                    ctx.globalAlpha = Math.max(0, d.life);
                    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, Math.atan2(d.vy, d.vx), 0, Math.PI * 2); ctx.fill();
                });
                blobs.forEach(function (b) {
                    if (b.life <= 0) return; alive = true; b.life -= b.decay;
                    ctx.globalAlpha = Math.max(0, b.life * 0.7);
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
                });
                ctx.globalAlpha = 1; frame++;
                if (alive && frame < 90) requestAnimationFrame(draw);
                else { canvas.classList.remove('active'); ctx.clearRect(0, 0, canvas.width, canvas.height); if (cb) cb(); }
            })();
        }
        brand.addEventListener('click', function () {
            var r = brand.getBoundingClientRect();
            var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            var logo = brand.querySelector('.logo') || brand;
            logo.style.transition = 'transform .3s'; logo.style.transform = 'scale(1.35) rotate(-8deg)';
            setTimeout(function () { logo.style.transform = ''; }, 300);
            var home = location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/');
            if (RM) { if (!home) location.href = 'index.html'; return; }
            if (home) splat(cx, cy, null);
            else splat(cx, cy, function () { location.href = 'index.html'; });
        });
    }

    /* ── Ambient sound: realistic rain synthesised live with Web Audio.
          Rain mode: filtered noise shower with droplet hiss and slow gusts.
          Clear mode: a whisper of night air. No audio files needed. ────── */
    var SND = { on: false, actx: null, rainBody: null, rainHiss: null, air: null };
    function noiseBuffer(actx, brown) {
        var len = actx.sampleRate * 2;
        var buf = actx.createBuffer(1, len, actx.sampleRate);
        var d = buf.getChannelData(0), last = 0;
        for (var i = 0; i < len; i++) {
            var w = Math.random() * 2 - 1;
            if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
            else { d[i] = w; }
        }
        return buf;
    }
    function chainNoise(actx, buf, filters) {
        var src = actx.createBufferSource();
        src.buffer = buf; src.loop = true;
        var node = src;
        filters.forEach(function (f) { node.connect(f); node = f; });
        var g = actx.createGain(); g.gain.value = 0;
        node.connect(g); g.connect(actx.destination);
        src.start();
        return g;
    }
    function ensureAudio() {
        if (SND.actx) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var actx = SND.actx = new AC();
        var white = noiseBuffer(actx, false);
        var brown = noiseBuffer(actx, true);
        /* shower body: band-limited noise like steady rain on pavement */
        var hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
        var lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
        SND.rainBody = chainNoise(actx, white, [hp, lp]);
        /* slow gusts: LFO wobbles the lowpass cutoff, not the volume */
        var lfo = actx.createOscillator(); lfo.frequency.value = 0.13;
        var lfoG = actx.createGain(); lfoG.gain.value = 180;
        lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
        /* droplet hiss: bright bandpass sparkle on top */
        var bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.6;
        SND.rainHiss = chainNoise(actx, white, [bp]);
        /* night air for clear mode */
        var lp2 = actx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 320;
        SND.air = chainNoise(actx, brown, [lp2]);
    }
    function fadeGain(g, v) {
        if (!g || !SND.actx) return;
        var t = SND.actx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(v, t + 1.4);
    }
    function applyWeatherAudio() {
        if (!SND.actx) return;
        if (!SND.on) {
            fadeGain(SND.rainBody, 0); fadeGain(SND.rainHiss, 0); fadeGain(SND.air, 0);
            return;
        }
        var rain = document.body.classList.contains('weather-rain');
        fadeGain(SND.rainBody, rain ? 0.22 : 0);
        fadeGain(SND.rainHiss, rain ? 0.05 : 0);
        fadeGain(SND.air, rain ? 0 : 0.05);
    }
    window.__applyWeatherAudio = applyWeatherAudio;
    function initSound() {
        var btn = document.querySelector('.snd-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            ensureAudio();
            if (!SND.actx) return;
            if (SND.actx.state === 'suspended') SND.actx.resume();
            SND.on = !SND.on;
            btn.classList.toggle('on', SND.on);
            applyWeatherAudio();
        });
    }

    /* ── Cinematic 4D rain: depth layers, wind, splashes, lightning ────── */
    function initRain() {
        var cv = document.createElement('canvas');
        cv.id = 'rain-canvas'; cv.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cv);
        var ctx = cv.getContext('2d');
        if (!ctx) return;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        var W, H, drops = [], splashes = [], running = false, rafId = null;
        var flash = 0, nextBolt = 0, wind = 0.8;
        function build() {
            W = cv.width = Math.round(innerWidth * DPR);
            H = cv.height = Math.round(innerHeight * DPR);
            cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
            var count = Math.min(600, Math.round(innerWidth * innerHeight / 1800));
            drops = [];
            for (var i = 0; i < count; i++) drops.push(newDrop(true));
        }
        function newDrop(anywhere) {
            var layer = Math.random();
            return {
                x: Math.random() * W * 1.2 - W * 0.1,
                y: anywhere ? Math.random() * H : -Math.random() * H * 0.4,
                len: (10 + layer * 26) * DPR,
                speed: (8 + layer * 20) * DPR,
                w: (0.6 + layer * 1.1) * DPR,
                a: 0.15 + layer * 0.35,
                depth: 0.35 + layer * 0.95
            };
        }
        function splash(x) {
            for (var i = 0; i < 5; i++) {
                splashes.push({ x: x, y: H - 2 * DPR, vx: (Math.random() - 0.5) * 3 * DPR, vy: -(1.5 + Math.random() * 3) * DPR, life: 1, r: (0.6 + Math.random() * 1.2) * DPR });
            }
        }
        function frame() {
            if (!running) return;
            ctx.clearRect(0, 0, W, H);
            var now = performance.now();
            if (now > nextBolt) { flash = 1; nextBolt = now + 7000 + Math.random() * 12000; }
            if (flash > 0) {
                ctx.fillStyle = 'rgba(210,225,255,' + (flash * 0.09).toFixed(3) + ')';
                ctx.fillRect(0, 0, W, H);
                flash -= 0.04;
            }
            for (var i = 0; i < drops.length; i++) {
                var d = drops[i];
                d.y += d.speed; d.x += wind * d.depth * DPR;
                if (d.y - d.len > H) {
                    if (Math.random() < 0.5) splash(d.x);
                    drops[i] = newDrop(false); continue;
                }
                var g = ctx.createLinearGradient(d.x, d.y - d.len, d.x + wind * d.depth * 4, d.y);
                g.addColorStop(0, 'rgba(190,205,230,0)');
                g.addColorStop(1, 'rgba(200,215,238,' + d.a.toFixed(2) + ')');
                ctx.strokeStyle = g; ctx.lineWidth = d.w; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(d.x, d.y - d.len);
                ctx.lineTo(d.x + wind * d.depth * 4, d.y);
                ctx.stroke();
            }
            for (var s = splashes.length - 1; s >= 0; s--) {
                var p = splashes[s];
                p.x += p.vx; p.y += p.vy; p.vy += 0.25 * DPR; p.life -= 0.05;
                if (p.life <= 0) { splashes.splice(s, 1); continue; }
                ctx.globalAlpha = Math.max(0, p.life * 0.5);
                ctx.fillStyle = 'rgba(205,218,240,1)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            rafId = requestAnimationFrame(frame);
        }
        function startRain() {
            if (running || RM) return;
            running = true; cv.classList.add('on'); build();
            rafId = requestAnimationFrame(frame);
        }
        function stopRain() {
            running = false; cv.classList.remove('on');
            if (rafId) cancelAnimationFrame(rafId);
            ctx.clearRect(0, 0, W || 0, H || 0);
        }
        window.__setRain = function (on) { on ? startRain() : stopRain(); };
        window.addEventListener('resize', function () { if (running) build(); }, { passive: true });
        if (document.body.classList.contains('weather-rain')) startRain();
    }

    /* ── Hidden terminal: press ` to toggle ────────────────────────────── */
    function initTerminal() {
        var overlay = document.createElement('div');
        overlay.className = 'hsx-terminal-overlay';
        overlay.innerHTML = '<div class="hsx-terminal" id="hsx-term" role="dialog" aria-modal="true" aria-label="HSX Terminal">' +
            '<div class="hsx-terminal-bar"><span class="t-dot red"></span><span class="t-dot yellow"></span><span class="t-dot green"></span>HSX TERMINAL<span>Press ` to toggle &middot; type help</span></div>' +
            '<div class="hsx-terminal-body" id="hsx-term-body"></div>' +
            '<div class="hsx-terminal-input-row"><span class="t-prompt">hsx&gt;&nbsp;</span><input class="t-input" id="hsx-term-input" type="text" autocomplete="off" spellcheck="false" placeholder="type a command" aria-label="Terminal input"></div>' +
            '</div>';
        document.body.appendChild(overlay);
        var term = document.getElementById('hsx-term'), body = document.getElementById('hsx-term-body'), inp = document.getElementById('hsx-term-input');
        var open = false;
        function print(text, cls) { var p = document.createElement('p'); p.className = 't-line' + (cls ? ' ' + cls : ''); p.textContent = text; body.appendChild(p); body.scrollTop = body.scrollHeight; }
        function welcome() { print('InHasnain Studio X Terminal', 'ok'); print('Type help to see available commands.', ''); }
        var COMMANDS = {
            help: function () { print('Available commands:', 'warn'); print('  about     about this studio', ''); print('  apps      list the apps', ''); print('  privacy   our privacy stance', ''); print('  clear     clear the terminal', ''); print('  close     close the terminal', ''); },
            clear: function () { body.innerHTML = ''; },
            close: function () { closeT(); },
            about: function () { print('Hasnain Studio X is an independent one-person studio in England, UK. It builds privacy-first Windows and Android tools, plus AI Studio workflows.', ''); },
            privacy: function () { print('Zero telemetry. Zero accounts. All processing stays on your device.', ''); },
            apps: function () {
                print('Windows (13 live): PC TuneX, PC GuardX, NimbusDock, HorizonOS, Drop2QR, QuantumDrop, XSeasons, SpatiaX Ultra, VAudio Elite, FlipX Studio, WorkX Suite, ForgeX Pro, HSX StudioFlow', '');
                print('Coming to Windows: HSX Pocket AI, Stillmotion, QuantumCast', '');
                print('Android: Mobile TuneX (live). Coming: XCipher, SpatiaX Mobile, FlipX Studio, DocsMining', '');
            }
        };
        function run(raw) { var cmd = raw.trim().toLowerCase(); if (!cmd) return; print('hsx> ' + cmd, 'cmd'); if (COMMANDS[cmd]) COMMANDS[cmd](); else print('Unknown command: "' + cmd + '". Type help.', 'err'); }
        function openT() { if (open) return; open = true; term.classList.add('open'); if (!body.hasChildNodes()) welcome(); setTimeout(function () { inp.focus(); }, 350); }
        function closeT() { if (!open) return; open = false; term.classList.remove('open'); }
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { run(inp.value); inp.value = ''; } if (e.key === 'Escape') closeT(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === '`' && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) === -1) { e.preventDefault(); open ? closeT() : openT(); }
        });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) closeT(); });
    }

    /* ── Voice navigation: hold Space, say a page name ─────────────────── */
    function initVoice() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        var ind = document.createElement('div');
        ind.className = 'voice-indicator';
        ind.innerHTML = '<span id="vi-text">Listening</span><span id="vi-res"></span>';
        document.body.appendChild(ind);
        var viText = ind.querySelector('#vi-text'), viRes = ind.querySelector('#vi-res');
        var PAGES = { home: 'index.html', windows: 'Windows-apps.html', apps: 'Windows-apps.html', android: 'android-apps.html', mobile: 'android-apps.html', studio: 'pricing.html', ai: 'pricing.html', pricing: 'pricing.html', contact: 'contact.html', email: 'contact.html' };
        var rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = true; rec.maxAlternatives = 4;
        var listening = false, holdTimer = null;
        function start() { if (listening) return; listening = true; ind.classList.add('active'); viText.textContent = 'Listening'; viRes.textContent = ''; try { rec.start(); } catch (e) {} }
        function stop() { if (!listening) return; listening = false; try { rec.stop(); } catch (e) {} setTimeout(function () { ind.classList.remove('active'); }, 600); }
        rec.onresult = function (e) {
            var transcript = Array.from(e.results).map(function (r) { return r[0].transcript; }).join(' ').toLowerCase().trim();
            viRes.textContent = '"' + transcript + '"';
            if (e.results[e.results.length - 1].isFinal) {
                var dest = null;
                transcript.split(/\s+/).forEach(function (w) { if (PAGES[w] && !dest) dest = PAGES[w]; });
                if (dest) { viText.textContent = 'Navigating'; viRes.textContent = '> ' + dest; stop(); setTimeout(function () { location.href = dest; }, 500); }
                else { viText.textContent = 'Not recognised'; setTimeout(stop, 1200); }
            }
        };
        rec.onerror = stop; rec.onend = function () { if (listening) { try { rec.start(); } catch (e) {} } };
        document.addEventListener('keydown', function (e) {
            if (e.code !== 'Space') return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) !== -1) return;
            if (e.repeat) return; e.preventDefault();
            holdTimer = setTimeout(start, 120);
        });
        document.addEventListener('keyup', function (e) { if (e.code !== 'Space') return; clearTimeout(holdTimer); if (listening) stop(); });
    }

    /* Boot all */
    ready(function () {
        initRain();
        initHeaderTools();
        initKineticWord();
        initSignature();
        initCursor();
        initStars();
        initStarfield();
        initCondensation();
        initWaveform();
        initInkSplat();
        initSound();
        initTerminal();
        initVoice();
    });
})();
