/* The campaign pages: the favourite app vote, feedback and ideas, and Bug Hunt
   reports. App lists come from the same catalogue the Hub reads, so a new or
   renamed app appears here without editing the pages. */
(function () {
    'use strict';

    var LIVE = /(^|\.)hasnainstudiox\.com$/.test(location.hostname);
    var API = LIVE ? 'https://api.hasnainstudiox.com/community/' : 'http://127.0.0.1:8787/community/';
    var MONTH = new Date().toISOString().slice(0, 7);

    function store(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, value);
        } catch (e) { /* private windows can refuse storage; the vote still works for this visit */ }
        return value;
    }

    function voterId() {
        var id = store('hsx-voter');
        if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
            id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
                : 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            store('hsx-voter', id);
        }
        return id;
    }

    function status(form, text, ok) {
        var el = form.querySelector('.form-status');
        if (!el) return;
        el.textContent = text;
        el.className = 'form-status ' + (ok ? 'is-ok' : 'is-err');
    }

    function send(path, body) {
        return fetch(API + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) {
            return r.json().catch(function () { return { ok: false }; }).then(function (data) {
                if (!r.ok || !data.ok) throw new Error(data.error || 'That did not go through. Please try again in a moment.');
                return data;
            });
        }, function () {
            throw new Error('We could not reach the server. Check your connection and try again.');
        });
    }

    /* ---- app lists ---- */

    function fillApps(catalogue) {
        var apps = catalogue.ps.filter(function (p) { return p.st === 'live'; });
        var groups = [
            ['Windows apps', apps.filter(function (p) { return p.pf === 'win'; }).map(function (p) { return p.n; }).concat(['HSX Apps Hub'])],
            ['Android apps', apps.filter(function (p) { return p.pf === 'and'; }).map(function (p) { return p.n; })]
        ];
        groups.forEach(function (g) { g[1].sort(function (a, b) { return a.localeCompare(b); }); });

        document.querySelectorAll('select[data-apps]').forEach(function (select) {
            var mode = select.getAttribute('data-apps');
            select.innerHTML = '';
            var first = document.createElement('option');
            first.value = '';
            first.textContent = 'Choose an app';
            select.appendChild(first);
            if (mode === 'feedback') {
                var fresh = document.createElement('option');
                fresh.value = 'A new app';
                fresh.textContent = 'A new app we do not make yet';
                fresh.setAttribute('data-idea-only', '');
                fresh.hidden = true;
                select.appendChild(fresh);
            }
            groups.forEach(function (g) {
                var group = document.createElement('optgroup');
                group.label = g[0];
                g[1].forEach(function (name) {
                    var o = document.createElement('option');
                    o.value = o.textContent = name;
                    group.appendChild(o);
                });
                select.appendChild(group);
            });
            var wanted = new URLSearchParams(location.search).get('app');
            if (wanted) select.value = wanted;
            if (mode === 'vote') {
                var mine = store('hsx-vote-' + MONTH);
                if (mine) select.value = mine;
            }
        });
    }

    var selects = document.querySelectorAll('select[data-apps]');
    if (selects.length) {
        fetch('hub-catalog.json').then(function (r) { return r.json(); }).then(fillApps).catch(function () {
            selects.forEach(function (s) { s.innerHTML = '<option value="">The app list could not load. Please refresh.</option>'; });
        });
    }

    /* ---- the vote ---- */

    var voteForm = document.getElementById('vote-form');
    var voteList = document.getElementById('vote-list');
    var range = 'thisMonth';
    var lastTallies = null;

    function render() {
        if (!voteList || !lastTallies) return;
        var rows = lastTallies[range] || [];
        var mine = store('hsx-vote-' + MONTH);
        voteList.innerHTML = '';
        if (!rows.length) {
            var empty = document.createElement('li');
            empty.className = 'vote-empty';
            empty.textContent = range === 'thisMonth' ? 'No votes yet this month. Be the first.' : 'No votes yet. Be the first.';
            voteList.appendChild(empty);
        }
        var top = rows.length ? rows[0].votes : 1;
        rows.slice(0, 10).forEach(function (row, i) {
            var li = document.createElement('li');
            if (range === 'thisMonth' && row.app === mine) li.className = 'is-yours';
            li.innerHTML = '<span class="vote-rank"></span><span class="vote-name"><span></span><span class="vote-bar"><i></i></span></span><span class="vote-n"></span>';
            li.querySelector('.vote-rank').textContent = String(i + 1).padStart(2, '0');
            li.querySelector('.vote-name span').textContent = row.app;
            li.querySelector('.vote-n').textContent = row.votes + (row.votes === 1 ? ' vote' : ' votes');
            voteList.appendChild(li);
            var bar = li.querySelector('.vote-bar i');
            requestAnimationFrame(function () { bar.style.width = Math.max(4, row.votes / top * 100) + '%'; });
        });
        var total = document.getElementById('vote-total');
        if (total) {
            total.textContent = range === 'thisMonth'
                ? lastTallies.total + (lastTallies.total === 1 ? ' vote' : ' votes') + ' this month. The poll resets on the first of each month.'
                : 'Every vote since the poll opened, one per voter per month.';
        }
    }

    function loadTallies() {
        fetch(API + 'votes', { headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (data) { if (data.ok) { lastTallies = data; render(); } else throw new Error(); })
            .catch(function () {
                if (voteList) voteList.innerHTML = '<li class="vote-empty">The results could not load right now.</li>';
            });
    }

    if (voteList) {
        loadTallies();
        document.querySelectorAll('.vote-tabs button').forEach(function (b) {
            b.addEventListener('click', function () {
                range = b.getAttribute('data-range');
                document.querySelectorAll('.vote-tabs button').forEach(function (x) {
                    x.setAttribute('aria-selected', x === b ? 'true' : 'false');
                });
                render();
            });
        });
    }

    if (voteForm) {
        voteForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var app = voteForm.elements['app'].value;
            if (!app) { status(voteForm, 'Choose an app first.', false); return; }
            var button = voteForm.querySelector('button[type="submit"]');
            button.disabled = true;
            send('vote', { app: app, voter: voterId() }).then(function (data) {
                store('hsx-vote-' + MONTH, app);
                lastTallies = data;
                range = 'thisMonth';
                document.querySelectorAll('.vote-tabs button').forEach(function (x) {
                    x.setAttribute('aria-selected', x.getAttribute('data-range') === 'thisMonth' ? 'true' : 'false');
                });
                render();
                status(voteForm, data.moved ? 'Your vote has moved to ' + app + '.' : 'Thanks, your vote for ' + app + ' is in.', true);
            }).catch(function (err) {
                status(voteForm, err.message, false);
            }).then(function () { button.disabled = false; });
        });
    }

    /* ---- feedback and ideas ---- */

    var fbForm = document.getElementById('feedback-form');

    function setKind(kind) {
        if (!fbForm) return;
        fbForm.querySelectorAll('input[name="kind"]').forEach(function (r) { r.checked = r.value === kind; });
        fbForm.querySelectorAll('[data-for-kind]').forEach(function (el) { el.hidden = el.getAttribute('data-for-kind') !== kind; });
        /* the visible label changes with the kind, so the field's spoken name follows it */
        fbForm.querySelectorAll('label[for]').forEach(function (label) {
            var field = document.getElementById(label.getAttribute('for'));
            var shown = label.querySelector('[data-for-kind="' + kind + '"]');
            if (field && shown) field.setAttribute('aria-label', shown.textContent);
        });
        var fresh = fbForm.querySelector('option[data-idea-only]');
        if (fresh) {
            fresh.hidden = kind !== 'idea';
            if (kind !== 'idea' && fbForm.elements['app'].value === 'A new app') fbForm.elements['app'].value = '';
        }
    }

    if (fbForm) {
        fbForm.querySelectorAll('input[name="kind"]').forEach(function (r) {
            r.addEventListener('change', function () { setKind(r.value); });
        });
        document.querySelectorAll('[data-kind-link]').forEach(function (a) {
            a.addEventListener('click', function () { setKind(a.getAttribute('data-kind-link')); });
        });
        setKind(location.hash === '#idea' ? 'idea' : 'feedback');

        fbForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var kind = fbForm.querySelector('input[name="kind"]:checked').value;
            var body = {
                kind: kind, app: fbForm.elements['app'].value, liked: fbForm.elements['liked'].value, improve: fbForm.elements['improve'].value,
                name: fbForm.elements['name'].value, email: fbForm.elements['email'].value, hsx_ref: fbForm.elements['hsx_ref'].value
            };
            if (!body.app) { status(fbForm, 'Choose an app, or for an idea, a new app.', false); return; }
            if (body.improve.trim().length < 10) { status(fbForm, 'Please write a little more, at least a sentence.', false); return; }
            var button = fbForm.querySelector('button[type="submit"]');
            button.disabled = true;
            send('feedback', body).then(function (data) {
                fbForm.reset();
                setKind(kind);
                status(fbForm, 'Thank you, it has reached us. Reference ' + data.reference + '.', true);
            }).catch(function (err) {
                status(fbForm, err.message, false);
            }).then(function () { button.disabled = false; });
        });
    }

    /* ---- problem finder ---- */

    var fixGrid = document.querySelector('.fix-grid');
    if (fixGrid) {
        var cards = [].slice.call(fixGrid.querySelectorAll('.fix-card'));
        var search = document.getElementById('fix-search');
        var chipsEl = [].slice.call(document.querySelectorAll('.fix-chip'));
        var count = document.querySelector('.fix-count');
        var none = document.querySelector('.fix-none');
        var cat = '';
        var filter = function () {
            var terms = search.value.toLowerCase().split(/\s+/).filter(Boolean);
            var shown = 0;
            cards.forEach(function (c) {
                var hay = (c.textContent + ' ' + c.getAttribute('data-words')).toLowerCase();
                var ok = (!cat || c.getAttribute('data-cat') === cat) && terms.every(function (t) { return hay.indexOf(t) !== -1; });
                c.hidden = !ok;
                if (ok) shown++;
            });
            count.textContent = shown + (shown === 1 ? ' problem' : ' problems');
            none.hidden = shown > 0;
        };
        chipsEl.forEach(function (b) {
            b.addEventListener('click', function () {
                cat = b.getAttribute('data-cat');
                chipsEl.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
                filter();
            });
        });
        search.addEventListener('input', filter);
        filter();
    }

    /* ---- bug reports ---- */

    var bugForm = document.getElementById('bug-form');
    if (bugForm) {
        bugForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var f = bugForm;
            if (!f.reportValidity()) return;
            var body = {
                app: f.elements['app'].value, severity: f.elements['severity'].value, version: f.elements['version'].value, windows: f.elements['windows'].value,
                title: f.elements['title'].value, steps: f.elements['steps'].value, expected: f.elements['expected'].value, actual: f.elements['actual'].value,
                name: f.elements['name'].value, email: f.elements['email'].value, credit: f.elements['credit'].value, agree: f.elements['agree'].checked,
                hsx_ref: f.elements['hsx_ref'].value
            };
            var button = f.querySelector('button[type="submit"]');
            button.disabled = true;
            send('bug', body).then(function (data) {
                f.reset();
                status(f, 'Thank you, your report is in. Your reference is ' + data.reference + '. We will reply by email once we have tried it.', true);
            }).catch(function (err) {
                status(f, err.message, false);
            }).then(function () { button.disabled = false; });
        });
    }
})();
