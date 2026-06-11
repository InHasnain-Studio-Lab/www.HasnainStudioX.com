/* ═══════════════════════════════════════════════════════════════════════
   HASNAIN STUDIO X — site.js
   Core interactions: page transitions, scroll progress, reveal-on-scroll,
   stat count-up, magnetic buttons, contact form, header state.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Page transition: fade in on load, fade out on internal nav ────── */
    var pg = document.getElementById('pg-transition');
    if (pg) {
        pg.classList.add('active');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { pg.classList.remove('active'); });
        });
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a');
            if (!a) return;
            var href = a.getAttribute('href') || '';
            if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
            if (!/\.html(\#.*)?$/i.test(href) || /^https?:\/\//i.test(href)) return;
            e.preventDefault();
            pg.classList.add('active');
            setTimeout(function () { window.location.href = href; }, reduceMotion ? 0 : 110);
        });
        // restore when navigating back from bfcache
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) pg.classList.remove('active');
        });
    }

    /* ── Header scrolled state + scroll progress ───────────────────────── */
    var bar = document.querySelector('.top-bar');
    var prog = document.getElementById('scroll-progress');
    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (bar) bar.classList.toggle('scrolled', y > 24);
        if (prog) {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ── Reveal on scroll ───────────────────────────────────────────────── */
    var revealEls = document.querySelectorAll('.reveal, .stagger');
    if ('IntersectionObserver' in window && revealEls.length) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('visible');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function (el) {
            if (el.classList.contains('stagger')) {
                Array.prototype.forEach.call(el.children, function (c, i) {
                    c.style.setProperty('--i', i);
                });
            }
            io.observe(el);
        });
    } else {
        revealEls.forEach(function (el) { el.classList.add('visible'); });
    }

    /* ── Stat number count-up (numeric stats only) ─────────────────────── */
    var stats = document.querySelectorAll('.stat-number');
    if ('IntersectionObserver' in window && stats.length && !reduceMotion) {
        var sio = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                sio.unobserve(en.target);
                var el = en.target;
                var raw = el.textContent.trim();
                var m = raw.match(/^(\d+)(\+?)$/);
                if (!m) return;
                var target = parseInt(m[1], 10), suffix = m[2];
                var t0 = null, dur = 1400;
                function step(ts) {
                    if (!t0) t0 = ts;
                    var p = Math.min((ts - t0) / dur, 1);
                    var eased = 1 - Math.pow(1 - p, 4);
                    el.textContent = Math.round(eased * target) + suffix;
                    if (p < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            });
        }, { threshold: 0.5 });
        stats.forEach(function (s) { sio.observe(s); });
    }

    /* ── Magnetic buttons (fine pointers only) ─────────────────────────── */
    if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
        document.querySelectorAll('.btn').forEach(function (btn) {
            btn.addEventListener('pointermove', function (e) {
                var r = btn.getBoundingClientRect();
                var dx = (e.clientX - r.left - r.width / 2) / r.width;
                var dy = (e.clientY - r.top - r.height / 2) / r.height;
                btn.style.transform = 'translate(' + dx * 7 + 'px,' + (dy * 5 - 3) + 'px)';
            });
            btn.addEventListener('pointerleave', function () {
                btn.style.transform = '';
            });
        });
    }

    /* ── Contact form: async submit with inline status ─────────────────── */
    var form = document.getElementById('contact-form');
    if (form) {
        var status = document.getElementById('contact-status');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var btn = form.querySelector('[type="submit"]');
            if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
            if (status) { status.style.color = ''; status.textContent = 'Transmitting…'; }
            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            }).then(function (res) {
                if (res.ok) {
                    form.reset();
                    if (status) status.textContent = '✓ Message sent — we’ll reply within 2 business days.';
                } else {
                    throw new Error('send failed');
                }
            }).catch(function () {
                if (status) {
                    status.style.color = '#f3b3cf';
                    status.textContent = 'Could not send. Please email Hasnain@outlook.at directly.';
                }
            }).finally(function () {
                if (btn) { btn.disabled = false; btn.style.opacity = ''; }
            });
        });
    }

    /* ── Footer year auto-update ────────────────────────────────────────── */
    document.querySelectorAll('.footer-bottom span').forEach(function (s) {
        s.innerHTML = s.innerHTML.replace(/©\s*\d{4}/, '© ' + new Date().getFullYear());
    });

    /* ── Scroll parallax: [data-parallax="0.12"] drifts with scroll ────── */
    var pxEls = document.querySelectorAll('[data-parallax]');
    if (pxEls.length && !reduceMotion) {
        var ticking = false;
        function parallax() {
            var vh = window.innerHeight;
            pxEls.forEach(function (el) {
                var f = parseFloat(el.dataset.parallax) || 0.1;
                var r = el.getBoundingClientRect();
                var center = r.top + r.height / 2 - vh / 2;
                el.style.transform = 'translateY(' + (-center * f).toFixed(1) + 'px)';
            });
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
        }, { passive: true });
        parallax();
    }
})();

/* ═══════════════════════════════════════════════════════════════════════
   AppViz — live animated previews so every app SHOWS what it does.
   Used by the Windows / Android catalogue renderers and the home page.
   ═══════════════════════════════════════════════════════════════════════ */
window.AppViz = (function () {
    /* One animation per app, derived from that app's real feature set:
       gauge    = junk cleanup + optimisation (PC TuneX, Mobile TuneX)
       qr       = QR design + export            (Drop2QR)
       dock     = dock with live app pins       (NimbusDock)
       transfer = device-to-device Wi-Fi share  (QuantumDrop)
       seasons  = seasonal wallpaper cycle      (XSeasons)
       spatial  = 3D positional audio field     (SpatiaX Ultra / Mobile)
       eq       = media player + visualizer     (VAudio Elite)
       convert  = local media conversion        (FlipX Studio)
       suite    = PDF / Word / spreadsheet docs (WorkX Suite)
       imagegen = GPU image generation render   (HSX StudioFlow)
       prompt   = structured prompt assembly    (ForgeX Pro)
       shell    = desktop shell + widgets       (HorizonOS)
       docs     = document text extraction      (DocsMining)
       lock     = AES-256 local encryption      (XCipher)            */
    var byId = {
        pctunex: 'gauge', mobiletunex: 'gauge',
        drop2qr: 'qr',
        nimbusdock: 'dock',
        quantumdrop: 'transfer',
        xseasons: 'seasons',
        spatiaxultra: 'spatial', spatiaxmobile: 'spatial',
        vaudioelite: 'eq',
        flipxstudio: 'convert', flipxandroid: 'convert',
        workxsuite: 'suite', hsxstudioflow: 'imagegen',
        forgexpro: 'prompt', horizonos: 'shell',
        docsmining: 'docs',
        xcipher: 'lock',
        pcguardx: 'guard',      /* privacy toggles dashboard */
        hsxpocketai: 'chat',    /* local AI chat */
        stillmotion: 'gallery', /* photo + video library */
        quantumcast: 'cast'     /* casting, details TBA */
    };
    var byCat = { utilities: 'gauge', media: 'eq', productivity: 'suite', ai: 'prompt' };
    function cells(n, tag) {
        var out = '';
        for (var i = 0; i < n; i++) out += '<' + tag + '></' + tag + '>';
        return out;
    }
    var tpl = {
        gauge:    '<span class="vg-ring"><span class="vg-core"></span></span><span class="vg-bars">' + cells(3, 'i') + '</span>',
        qr:       '<span class="vq">' + cells(25, 'i') + '</span>',
        dock:     '<span class="vd">' + cells(5, 'i') + '</span>',
        transfer: '<span class="vt-node"></span><span class="vt-line">' + cells(3, 'i') + '</span><span class="vt-node"></span>',
        seasons:  '<span class="vs"><i class="sun"></i><i class="hill"></i></span>',
        eq:       '<span class="ve">' + cells(7, 'i') + '</span>',
        convert:  '<span class="vc-chip">MP4</span><span class="vc-arrows">⟳</span><span class="vc-chip">MP3</span>',
        spatial:  '<span class="vsp"><i class="vsp-ring"></i><i class="vsp-ring vsp-ring2"></i><b class="vsp-head"></b><span class="vsp-orbit"><i class="vsp-orb"></i></span></span>',
        suite:    '<span class="vsu"><b>PDF</b><b>DOC</b><b>XLS</b></span>',
        imagegen: '<span class="vimg"><i class="vimg-fill"></i><i class="vimg-peak"></i><b class="vimg-bar"></b></span>',
        prompt:   '<span class="vpr"><i></i><i></i><i></i><b class="vpr-cursor"></b></span>',
        shell:    '<span class="vsh"><i></i><i></i><i></i><i></i><b class="vsh-dock"></b></span>',
        docs:     '<span class="vdoc">' + cells(4, 'i') + '<span class="scan"></span></span>',
        lock:     '<span class="vl"><span class="vl-pad"></span><span class="vl-code">A7·K2·X9</span></span>',
        guard:    '<span class="vgd"><i class="vgd-shield"></i><span class="vgd-toggles"><b></b><b></b><b></b></span></span>',
        chat:     '<span class="vch"><i class="vch-b1"></i><i class="vch-b2"><b></b><b></b><b></b></i></span>',
        gallery:  '<span class="vga"><i></i><i></i><i></i><b class="vga-glint"></b></span>',
        cast:     '<span class="vca"><i class="vca-scr"></i><i class="vca-w vca-w1"></i><i class="vca-w vca-w2"></i><i class="vca-w vca-w3"></i></span>'
    };
    return function (app) {
        var type = byId[app.id] || byCat[app.category] || 'ai';
        return '<div class="viz viz-' + type + '" aria-hidden="true">' + tpl[type] + '</div>';
    };
})();

/* Catalogue pages render their grid before this file loads — re-render once
   AppViz exists so every tile gets its live preview. */
(function () {
    try {
        if (typeof renderGrid === 'function' && document.getElementById('apps-grid')) {
            renderGrid(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
        }
    } catch (e) { /* no-op */ }
})();
