/* HASNAIN STUDIO X - site.js
   Core interactions: page transitions, scroll progress, reveal-on-scroll,
   stat count-up, magnetic buttons, contact form, header state. */
(function () {
    'use strict';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Page transition: fade in on load, fade out on internal nav */
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

    /* Header scrolled state + scroll progress */
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

    /* Reveal on scroll */
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

    /* Stat number count-up (numeric stats only) */
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

    /* Magnetic buttons (fine pointers only) */
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

    /* Contact form: async submit with inline status */
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
                /* a 200 is not proof of delivery: anything else answering this
                   URL can return one. Only the endpoint's own {"ok":true} is. */
                return res.json().catch(function () { return null; });
            }).then(function (data) {
                /* the endpoint says what was wrong; showing 'could not send'
                   instead leaves the visitor with nothing to act on */
                if (!data || data.ok !== true) throw new Error((data && data.error) || '');
                form.reset();
                if (status) status.textContent = form.id === 'contest-form'
                    ? '✓ Entry received - good luck. Winners are announced on X.'
                    : '✓ Message sent - we’ll reply within 2 business days.';
            }).catch(function (err) {
                if (status) {
                    var said = err && err.message;
                    status.style.color = '#f3b3cf';
                    status.textContent = said
                        ? said + ' You can also email contact@hasnainstudiox.com.'
                        : 'Could not send. Please email contact@hasnainstudiox.com.';
                }
            }).finally(function () {
                if (btn) { btn.disabled = false; btn.style.opacity = ''; }
            });
        });
    });

    /* Footer year auto-update */
    document.querySelectorAll('.footer-bottom span').forEach(function (s) {
        s.innerHTML = s.innerHTML.replace(/©\s*\d{4}/, '© ' + new Date().getFullYear());
    });

    /* Scroll parallax: [data-parallax="0.12"] drifts with scroll */
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

/* AppViz - live animated previews so every app SHOWS what it does.
   Used by the Windows / Android catalogue renderers and the home page. */
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

/* Catalogue pages render their grid before this file loads - re-render once
   AppViz exists so every tile gets its live preview. */
(function () {
    try {
        if (typeof renderGrid === 'function' && document.getElementById('apps-grid')) {
            renderGrid(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
        }
    } catch (e) { /* no-op */ }
})();

    /* Made With HSX: monthly challenge countdown
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

    /* Prompt guide tabs (AI Studio)
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


/* Native Microsoft Store links
   On Windows, ms-windows-store://pdp/?ProductId=... opens the Store app
   straight on the product page, removing the browser hop and the second
   click. It is added only when the visitor is actually on Windows: elsewhere
   the protocol has no handler and the click would do nothing, so the link
   stays hidden and the ordinary web link remains the only route. */
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

/* Copy-site notice
   A visitor who followed a link from a site redistributing these apps is told
   the copy there is not ours. Only the referring host is read, in the browser,
   and nothing is stored or sent anywhere. Sites that strip the referrer are
   simply not recognised. */
(function () {
  var box = document.getElementById('copy-notice');
  if (!box || !document.referrer) return;

  var host;
  try { host = new URL(document.referrer).hostname.toLowerCase(); } catch (e) { return; }

  var known = [
    'fcportables.com', 'psychodownloads.com', 'tutbb.com', 'phcorner.org', 'phcorner.net',
    'avxhm.se', 'fullwarezcrack.com', 'filecr.com', 'warez.ge', 'dl4all.org', 'dl4all.com',
    'cmteampk.com', 'filespayouts.com', 'downturk.net', 'gfxplugin.com', 'forums.srcds.com',
    'softarchive.is', 'softarchive.la', 'sanet.st', 'sanet.lc'
  ];
  var listed = known.some(function (d) {
    return host === d || host.slice(-(d.length + 1)) === '.' + d;
  });
  /* these rotate their numbered or regional domains, so match the family */
  var family = /(^|\.)(gfxtra\d*|avxhm|avaxhome|softarchive|sanet)\./.test(host)
    || /warez|crack|nulled|torrent/.test(host);

  if (listed || family) box.removeAttribute('hidden');
})();

/* Pillar page section navigation
   Marks whichever section is currently in view. Runs only on pages that
   actually have the bar, and does nothing at all without JavaScript beyond
   leaving a working row of anchor links. */
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

/* Tutorial videos
   The page shows a picture stored on this site; YouTube is contacted only
   when the visitor presses play. */
(function () {
  document.addEventListener('click', function (e) {
    var button = e.target.closest && e.target.closest('.app-video-play');
    if (!button) return;
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(button.getAttribute('data-yt')) + '?autoplay=1&rel=0';
    frame.title = button.getAttribute('data-title') || 'Video';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
  });
})();

/* Store campaign tags
   Each Microsoft Store and Google Play link is tagged with the page it was
   followed from, so Partner Center and Play Console can show which page led
   to an install. The tag is added as the link is used, so dynamically built
   links are covered too. Nothing is stored and no cookie is set. A page opened
   from a post as page.html?c=x-oct carries that label into its tags. */
(function () {
  function pageId() {
    var p = location.pathname.toLowerCase();
    if (p === '/' || p === '/index.html') return 'home';
    var m = p.match(/^\/(apps|guides)\/([a-z0-9-]+?)(\.html)?$/);
    if (m) return (m[1] === 'apps' ? 'app-' : 'guide-') + m[2];
    var f = p.replace(/^\/|\.html$/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return f || 'home';
  }
  var inbound = (new URLSearchParams(location.search).get('c') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);

  function campaign(a) {
    var holder = a.closest('[data-cid]');
    var id = 'web-' + (holder ? holder.getAttribute('data-cid') : pageId());
    return (inbound ? id + '.' + inbound : id).slice(0, 100);
  }

  function tag(a) {
    var href = a.getAttribute('href') || '';
    var cid = encodeURIComponent(campaign(a));
    var m;
    if ((m = href.match(/^https:\/\/apps\.microsoft\.com\/detail\/([a-z0-9]+)/i)))
      a.setAttribute('href', 'https://apps.microsoft.com/detail/' + m[1] + '?cid=' + cid);
    else if ((m = href.match(/^ms-windows-store:\/\/pdp\/\?productid=([a-z0-9]+)/i)))
      a.setAttribute('href', 'ms-windows-store://pdp/?ProductId=' + m[1] + '&cid=' + cid);
    else if (/^https:\/\/apps\.microsoft\.com\/search\/publisher\?name=/i.test(href))
      a.setAttribute('href', href.replace(/&cid=[^&]*/i, '') + '&cid=' + cid);
    else if ((m = href.match(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=([a-z0-9._]+)/i)))
      a.setAttribute('href', 'https://play.google.com/store/apps/details?id=' + m[1] + '&referrer='
        + encodeURIComponent('utm_source=hasnainstudiox&utm_medium=website&utm_campaign=' + decodeURIComponent(cid)));
  }

  ['click', 'auxclick', 'contextmenu'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a) tag(a);
    }, true);
  });
})();

/* "Check this PC" on app pages: compares what the browser reports with the Store minimums. Nothing leaves the page. */
(function () {
    var box = document.querySelector('.fit-check');
    if (!box) return;
    var out = box.querySelector('.fit-out');
    var line = function (ok, text) {
        var li = document.createElement('li');
        li.className = ok === true ? 'fit-ok' : ok === false ? 'fit-low' : 'fit-unknown';
        li.textContent = text;
        out.appendChild(li);
    };
    box.querySelector('.fit-run').addEventListener('click', function () {
        out.textContent = '';
        var needBuild = +box.getAttribute('data-build') || 0;
        var needMem = +box.getAttribute('data-mem') || 0;
        var needCores = +box.getAttribute('data-cores') || 0;
        var uad = navigator.userAgentData;
        var isWin = uad ? uad.platform === 'Windows' : /Windows NT/.test(navigator.userAgent);
        var osDone = (uad && uad.getHighEntropyValues && isWin
            ? uad.getHighEntropyValues(['platformVersion']).then(function (v) { return parseInt(v.platformVersion, 10); })
            : Promise.resolve(null)
        ).then(function (major) {
            if (!isWin) return line(false, 'This browser is not running on Windows. The app installs on a Windows PC from the Microsoft Store.');
            if (major >= 13) return line(true, 'Windows 11 - meets the Windows requirement.');
            if (major > 0) return line(needBuild >= 22000 ? false : null, needBuild >= 22000
                ? 'Windows 10 - this app needs Windows 11.'
                : 'Windows 10 - fine if it is up to date (version 2004 or later). Settings, then System, then About shows your version.');
            line(null, 'Windows - this browser does not say which version. Settings, then System, then About shows it.');
        }).catch(function () { line(null, 'Windows - this browser does not say which version.'); });
        osDone.then(function () {
            if (!isWin) return;
            var threads = navigator.hardwareConcurrency || 0;
            if (needCores && threads) {
                line(threads >= needCores ? true : null, threads >= needCores
                    ? 'Processor - ' + threads + ' logical processors reported; the minimum is ' + needCores + ' cores.'
                    : 'Processor - ' + threads + ' logical processors reported; the minimum is ' + needCores + ' cores, so it may struggle.');
            }
            var mem = navigator.deviceMemory;
            if (needMem && mem) {
                if (mem >= needMem) line(true, 'Memory - at least ' + mem + ' GB reported; the minimum is ' + needMem + ' GB.');
                else if (mem >= 8) line(null, 'Memory - browsers report at most 8 GB; the minimum is ' + needMem + ' GB. Task Manager, then Performance, shows the real figure.');
                else line(false, 'Memory - about ' + mem + ' GB reported; the minimum is ' + needMem + ' GB.');
            } else if (needMem) {
                line(null, 'Memory - this browser does not report it. Task Manager, then Performance, shows it; the minimum is ' + needMem + ' GB.');
            }
        });
    });
})();

/* Site search: a header button, "/" or Ctrl+K. The index loads on first use and every match happens in the page. */
(function () {
    var root = (function () {
        var s = document.querySelector('script[src*="site."]');
        return s ? s.src.replace(/site\.[^\/]*$/, '') : '/';
    })();
    var data = null, dlg, input, list, items = [], active = -1;

    function build() {
        dlg = document.createElement('div');
        dlg.className = 'srch';
        dlg.setAttribute('role', 'dialog');
        dlg.setAttribute('aria-modal', 'true');
        dlg.setAttribute('aria-label', 'Search the site');
        dlg.hidden = true;
        dlg.innerHTML = '<div class="srch-box"><label class="visually-hidden" for="srch-q">Search apps, guides and fixes</label>' +
            '<input id="srch-q" class="srch-q" type="search" autocomplete="off" placeholder="Search apps, guides and fixes" role="combobox" aria-expanded="true" aria-controls="srch-list">' +
            '<ul id="srch-list" class="srch-list" role="listbox"></ul>' +
            '<p class="srch-hint"><kbd>Enter</kbd> open <kbd>&uarr;</kbd><kbd>&darr;</kbd> move <kbd>Esc</kbd> close</p></div>';
        document.body.appendChild(dlg);
        input = dlg.querySelector('.srch-q');
        list = dlg.querySelector('.srch-list');
        dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
        input.addEventListener('input', run);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!items.length) return;
                active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                paint();
            } else if (e.key === 'Enter' && items[active]) {
                location.href = root + items[active].u;
            } else if (e.key === 'Escape') {
                close();
            } else if (e.key === 'Tab') {
                e.preventDefault();
            }
        });
    }

    function score(it, terms) {
        var t = it.t.toLowerCase(), all = (it.t + ' ' + it.d + ' ' + (it.w || '') + ' ' + it.k).toLowerCase(), s = 0;
        for (var i = 0; i < terms.length; i++) {
            if (all.indexOf(terms[i]) === -1) return 0;
            s += t.indexOf(terms[i]) === 0 ? 6 : t.indexOf(terms[i]) !== -1 ? 4 : 1;
        }
        return s + (it.k === 'Windows app' || it.k === 'Android app' ? 1 : 0);
    }

    function run() {
        var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        items = !terms.length || !data ? [] : data
            .map(function (it) { return { it: it, s: score(it, terms) }; })
            .filter(function (x) { return x.s; })
            .sort(function (a, b) { return b.s - a.s; })
            .slice(0, 12).map(function (x) { return x.it; });
        active = items.length ? 0 : -1;
        paint();
    }

    function paint() {
        list.textContent = '';
        if (!items.length && input.value.trim()) {
            var none = document.createElement('li');
            none.className = 'srch-none';
            none.textContent = data ? 'Nothing found. Try another word, or browse the Fix it page.' : 'Loading...';
            list.appendChild(none);
            return;
        }
        items.forEach(function (it, i) {
            var li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.id = 'srch-o' + i;
            li.setAttribute('aria-selected', i === active ? 'true' : 'false');
            var a = document.createElement('a');
            a.href = root + it.u;
            var k = document.createElement('span'); k.className = 'srch-k'; k.textContent = it.k;
            var t = document.createElement('b'); t.textContent = it.t;
            var d = document.createElement('span'); d.className = 'srch-d'; d.textContent = it.d;
            a.appendChild(k); a.appendChild(t); a.appendChild(d);
            li.appendChild(a);
            list.appendChild(li);
        });
        input.setAttribute('aria-activedescendant', active >= 0 ? 'srch-o' + active : '');
        var cur = list.children[active];
        if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }

    var opener = null;
    function open() {
        if (!dlg) build();
        opener = document.activeElement;
        dlg.hidden = false;
        document.documentElement.classList.add('srch-open');
        input.focus();
        input.select();
        if (!data) {
            fetch(root + 'search-index.json').then(function (r) { return r.json(); })
                .then(function (d) { data = d; run(); })
                .catch(function () { data = []; });
        }
    }
    function close() {
        dlg.hidden = true;
        document.documentElement.classList.remove('srch-open');
        if (opener && opener.focus) opener.focus();
    }

    function addButton() {
        var bar = document.querySelector('.top-bar');
        if (!bar || bar.querySelector('.srch-btn')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tool-btn srch-btn';
        b.setAttribute('aria-label', 'Search the site');
        b.title = 'Search (/)';
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="lbl">SEARCH</span>';
        b.addEventListener('click', open);
        var nav = bar.querySelector('nav');
        bar.insertBefore(b, nav ? nav.nextSibling : null);
    }
    addButton();

    document.addEventListener('keydown', function (e) {
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
        if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
            e.preventDefault();
            if (dlg && !dlg.hidden) close(); else open();
        }
    });
})();
