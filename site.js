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
    /* Any form marked [data-async] posts without a page reload and reports
       into the <p> named by its id + '-status'. */
    document.querySelectorAll('form[data-async], #contact-form').forEach(function (form) {
        var status = document.getElementById(form.id + '-status')
                  || document.getElementById('contact-status');
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
                    if (status) status.textContent = form.id === 'contest-form'
                        ? '✓ Entry received — good luck. Winners are announced on X.'
                        : '✓ Message sent — we’ll reply within 2 business days.';
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
    });

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
       qr       = QR design + export            (QR Creator Studio)
       dock     = dock with live app pins       (NimbusDock)
       transfer = device-to-device Wi-Fi share  (QuantumDrop)
       seasons  = seasonal wallpaper cycle      (XSeasons)
       spatial  = 3D positional audio field     (SpatiaX Ultra / Mobile)
       eq       = media player + visualizer     (VAudio Elite)
       convert  = local media conversion        (FlipX Studio)
       suite    = PDF / Word / spreadsheet docs (HSX WorkX Suite, WorkX Suite)
       imagegen = GPU image generation render   (HSX StudioFlow)
       prompt   = structured prompt assembly    (HSX PromptKinetics)
       shell    = desktop shell + widgets       (SolsticeOS)
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
        flipxstudio: 'convert',
        workxsuite: 'suite', hsxstudioflow: 'imagegen',
        forgexpro: 'prompt', horizonos: 'shell',
        docsmining: 'docs',
        pcguardx: 'guard',      /* privacy toggles dashboard */
        pocktium: 'chat',    /* local AI chat */
        photovidix: 'gallery', /* photo + video library */
        castvisuality: 'cast'     /* casting, details TBA */
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

    /* ══ Made With HSX: monthly challenge countdown ══════════════════════
       The deadline is the last moment of the current month, computed in the
       visitor's own clock, so nothing needs editing month to month. Add an
       entry to THEMES to name a month; anything unlisted shows "Open theme". */
    (function () {
        var wrap = document.getElementById('mw-count');
        if (!wrap) return;

        var THEMES = {
            '2026-08': 'Open theme',
            '2026-09': 'Machines and light',
            '2026-10': 'Something in the dark',
            '2026-11': 'Portraits of nobody',
            '2026-12': 'Winter, rendered locally'
        };

        var d = document.getElementById('mw-d'), h = document.getElementById('mw-h'),
            m = document.getElementById('mw-m'), s = document.getElementById('mw-s'),
            themeEl = document.getElementById('mw-theme');

        function pad(n) { return (n < 10 ? '0' : '') + n; }

        function deadline() {
            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        function monthKey() {
            var n = new Date();
            return n.getFullYear() + '-' + pad(n.getMonth() + 1);
        }
        if (themeEl) themeEl.textContent = THEMES[monthKey()] || 'Open theme';

        function tick() {
            var left = deadline() - new Date();
            if (left <= 0) {
                wrap.innerHTML = '<p class="mw-closed">Entries closed for this month. '
                                 + 'The next round opens on the 1st.</p>';
                return;
            }
            var sec = Math.floor(left / 1000);
            d.textContent = pad(Math.floor(sec / 86400));
            h.textContent = pad(Math.floor(sec % 86400 / 3600));
            m.textContent = pad(Math.floor(sec % 3600 / 60));
            s.textContent = pad(sec % 60);
            setTimeout(tick, 1000);
        }
        tick();
    })();

    /* ── Prompt guide tabs (AI Studio) ─────────────────────────────────
       Markup ships with every panel visible so crawlers and no-JS readers
       get the whole guide; this turns it into a tabbed panel. */
    (function promptGuideTabs() {
        var wrap = document.querySelector('.pg-wrap');
        if (!wrap) return;
        var tabs   = [].slice.call(wrap.querySelectorAll('.pg-tab'));
        var panels = [].slice.call(wrap.querySelectorAll('.pg-panel'));
        if (!tabs.length || tabs.length !== panels.length) { wrap.classList.add('pg-plain'); return; }

        function select(i, focus) {
            tabs.forEach(function (t, n) {
                var on = n === i;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                if (on) panels[n].removeAttribute('data-inactive');
                else panels[n].setAttribute('data-inactive', '');
            });
            if (focus) tabs[i].focus();
        }

        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { select(i); });
            t.addEventListener('keydown', function (ev) {
                var k = ev.key, n = null;
                if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
                else if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
                else if (k === 'Home') n = 0;
                else if (k === 'End') n = tabs.length - 1;
                if (n !== null) { ev.preventDefault(); select(n, true); }
            });
        });
        select(0);
    })();


/* ── Native Microsoft Store links ──────────────────────────────────────────
   On Windows, ms-windows-store://pdp/?ProductId=... opens the Store app
   straight on the product page, removing the browser hop and the second
   click. It is added only when the visitor is actually on Windows: elsewhere
   the protocol has no handler and the click would do nothing, so the link
   stays hidden and the ordinary web link remains the only route.
   ────────────────────────────────────────────────────────────────────── */
(function () {
  var links = document.querySelectorAll('a.store-native[data-pid]');
  if (!links.length) return;
  var ua = navigator.userAgentData;
  var onWindows = ua && ua.platform
    ? ua.platform === 'Windows'
    : /Win(dows|32|64)/i.test(navigator.userAgent || '');
  if (!onWindows) return;
  Array.prototype.forEach.call(links, function (el) {
    el.setAttribute('href', 'ms-windows-store://pdp/?ProductId=' + el.dataset.pid);
    el.removeAttribute('hidden');
  });
})();

/* ── Pillar page section navigation ───────────────────────────────────────
   Marks whichever section is currently in view. Runs only on pages that
   actually have the bar, and does nothing at all without JavaScript beyond
   leaving a working row of anchor links.
   ────────────────────────────────────────────────────────────────────── */
(function () {
  var bar = document.getElementById('pillar-nav');
  if (!bar || !('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
  var maps = links.map(function (a) {
    return { link: a, section: document.getElementById(a.getAttribute('href').slice(1)) };
  }).filter(function (m) { return m.section; });
  if (!maps.length) return;

  var visible = new Set();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
    });
    var current = null;
    for (var i = 0; i < maps.length; i++) if (visible.has(maps[i].section)) { current = maps[i]; break; }
    maps.forEach(function (m) {
      if (m === current) m.link.setAttribute('aria-current', 'true');
      else m.link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-160px 0px -55% 0px', threshold: 0 });
  maps.forEach(function (m) { io.observe(m.section); });
})();
