/* =====================================================================
   KEXXY — RITUAL DE CROMO · lógica del presskit
   - Textos y datos salen de content.json y dates.json (los edita el panel /admin.html).
   - ES vive en el HTML; EN/PT llegan desde content.json.
   - Todo late a 150 BPM: el CSS anima con .is-live y el WebGL usa el mismo reloj.
   ===================================================================== */
(() => {
  'use strict';

  const D = document;
  const root = D.documentElement;
  const $ = (s, el) => (el || D).querySelector(s);
  const $$ = (s, el) => Array.from((el || D).querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const BEAT = 0.4;
  const TZ = 'America/Argentina/Mendoza';
  const SCRIPT_URL = (D.currentScript && D.currentScript.src) || location.href;
  const LIVE = '/api/public?file=';

  // H.264 donde se pueda (Safari, Chrome, Edge); VP9 si el navegador no trae ese códec
  const CAN_MP4 = (() => {
    try { const v = D.createElement('video'); return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.64001F"')); } catch (e) { return false; }
  })();
  const videoSrc = (name) => 'assets/video/' + name + (CAN_MP4 ? '.mp4' : '.webm');

  const store = {
    get(kind, k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
    set(kind, k, v) { try { window[kind].setItem(k, v); } catch (e) { /* modo privado */ } }
  };

  const el = (tag, cls, text) => {
    const n = D.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  const track = (name, data) => {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, data || {}); } catch (e) { /* sin analytics */ }
  };

  /* =====================================================================
     TEXTOS (i18n)
     ===================================================================== */
  let content = null;
  let dates = null;
  let lang = 'es';
  let langs = ['es', 'en', 'pt'];

  // El español de base es el que está escrito en el HTML.
  const BASE = {};
  $$('[data-i18n]').forEach((n) => {
    const k = n.dataset.i18n;
    if (!(k in BASE)) BASE[k] = n.hasAttribute('data-i18n-html') ? n.innerHTML.trim() : n.textContent.trim();
  });
  $$('[data-i18n-placeholder]').forEach((n) => { BASE[n.dataset.i18nPlaceholder] = n.placeholder; });
  $$('[data-i18n-title]').forEach((n) => { BASE[n.dataset.i18nTitle] = n.title; });

  function t(key) {
    const d = content && content.i18n;
    const pick = (l) => {
      const v = d && d[l] && d[l][key];
      return v != null && String(v).trim() !== '' ? String(v) : null;
    };
    return pick(lang) || pick('es') || (BASE[key] != null ? BASE[key] : '');
  }

  const ALLOWED = { EM: 1, BR: 1, STRONG: 1, B: 1, I: 1, SPAN: 1 };
  function clean(node) {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 1) {
        if (!ALLOWED[n.tagName]) { n.replaceWith(D.createTextNode(n.textContent)); return; }
        Array.from(n.attributes).forEach((a) => n.removeAttribute(a.name));
        clean(n);
      } else if (n.nodeType !== 3) {
        n.remove();
      }
    });
  }
  function setRich(node, html) {
    const tpl = D.createElement('template');
    tpl.innerHTML = html;
    clean(tpl.content);
    node.replaceChildren(tpl.content);
  }
  function plain(s) {
    if (!/[<&]/.test(s)) return s;
    const tpl = D.createElement('template');
    tpl.innerHTML = s;
    return tpl.content.textContent;
  }

  function applyTexts() {
    $$('[data-i18n]').forEach((n) => {
      if (n._scrambling) return; // el scramble escribe el texto final al terminar
      const v = t(n.dataset.i18n);
      if (n.hasAttribute('data-i18n-html')) setRich(n, v);
      else n.textContent = plain(v);
    });
    $$('[data-i18n-placeholder]').forEach((n) => { n.placeholder = plain(t(n.dataset.i18nPlaceholder)); });
    $$('[data-i18n-title]').forEach((n) => { n.title = plain(t(n.dataset.i18nTitle)); });
  }

  /* textos compuestos: se separan por / , . · y se unen con barras rojas */
  function slashList(node, text, sep) {
    const parts = String(text).split(sep).map((s) => s.trim()).filter(Boolean);
    node.replaceChildren();
    parts.forEach((p, i) => {
      if (i) { node.append(' '); node.append(el('em', null, '/')); node.append(' '); }
      node.append(p.replace(/-/g, '\u2011'));
    });
  }

  /* =====================================================================
     AJUSTE DE TEXTOS: los títulos van en una línea y se achican si no entran
     ===================================================================== */
  function fitLine(node, min) {
    node.style.fontSize = '';
    const start = parseFloat(getComputedStyle(node).fontSize);
    let size = start;
    let guard = 60;
    while (node.scrollWidth > node.clientWidth + 1 && size > min && guard--) {
      size -= size > 40 ? 2 : 1;
      node.style.fontSize = size + 'px';
    }
  }
  // bloques que pueden ocupar varias líneas pero nunca cortar una palabra al medio
  function fitWords(node, min) {
    node.style.fontSize = '';
    let size = parseFloat(getComputedStyle(node).fontSize);
    let guard = 40;
    while (node.scrollWidth > node.clientWidth + 1 && size > min && guard--) {
      size -= 1;
      node.style.fontSize = size + 'px';
    }
  }
  function fitTexts() {
    $$('.sec__titles h2').forEach((h) => fitLine(h, 18));
    $$('.booking__title').forEach((h) => fitLine(h, 26));
    $$('.hotcues__grid .n, .tracklist__t .v, .deck__title, .shared__names, .booth__stats dd, .rider__quick dd').forEach((n) => fitWords(n, 11));
  }
  let fitTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitTexts, 120); });

  /* =====================================================================
     SCRAMBLE tipo pantalla de CDJ
     ===================================================================== */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—';
  function applyTextsIn(scope) {
    $$('[data-i18n]', scope).forEach((n) => {
      const v = t(n.dataset.i18n);
      if (n.hasAttribute('data-i18n-html')) setRich(n, v); else n.textContent = plain(v);
    });
  }
  function scramble(node, dur, onDone) {
    if (reduced() || node._scrambling) return;
    const html = node.innerHTML;
    const keyed = node.dataset.i18n;
    const target = () => plain(keyed ? t(keyed) : node.textContent);
    const text = target();
    if (!text) return;
    node._scrambling = true;
    const t0 = performance.now();
    const d = dur || 700;
    (function frame(now) {
      const p = Math.min(1, (now - t0) / d);
      if (p >= 1) {
        node._scrambling = false;
        if (keyed) {
          const v = t(keyed);
          if (node.hasAttribute('data-i18n-html')) setRich(node, v); else node.textContent = plain(v);
        } else {
          node.innerHTML = html;
          applyTextsIn(node);
        }
        if (node.closest('.sec__titles')) fitLine(node, 18);
        if (onDone) onDone();
        return;
      }
      const tick = Math.floor(now / 33);
      node.textContent = Array.from(text).map((c, i) => {
        if (c === ' ' || i / text.length < p) return c;
        const r = Math.sin((tick * 31 + i * 7) * 12.9898) * 43758.5453;
        return GLYPHS[Math.floor((r - Math.floor(r)) * GLYPHS.length)];
      }).join('');
      requestAnimationFrame(frame);
    })(t0);
  }

  /* =====================================================================
     DATOS: links del artista, imágenes, secciones, stats, géneros, productoras
     ===================================================================== */
  const SECTIONS = {
    listen: { sec: '#sets', cue: 'sets' },
    dates: { sec: '#dates', cue: 'dates' },
    bio: { sec: '#bio', cue: 'bio' },
    live: { sec: '#live', cue: 'live' },
    rider: { sec: '#rider', cue: 'rider' }
  };

  function sectionOn(key) {
    const s = content && content.sections;
    return !s || s[key] !== false;
  }

  function applySections() {
    Object.keys(SECTIONS).forEach((key) => {
      const on = sectionOn(key);
      const conf = SECTIONS[key];
      const sec = $(conf.sec);
      if (sec) sec.hidden = !on;
      $$('.top__nav a[href="' + conf.sec + '"], .cues a[href="' + conf.sec + '"]').forEach((a) => { a.hidden = !on; });
    });
    const about = $('.about');
    if (about) about.hidden = !sectionOn('about');
    // sin sección de sets, "Escuchar" lleva directo a SoundCloud
    const listen = $('.hero__ctas a[href="#sets"]');
    const sc = content && content.artist && content.artist.socials && content.artist.socials.soundcloud;
    if (listen && !sectionOn('listen') && sc) { listen.href = sc; listen.target = '_blank'; listen.rel = 'noopener'; }
  }

  const HERO_DEFAULT = 'assets/img/hero.webp';
  // las fotos que sube el panel (img/…) se leen en vivo del repo: así aparecen sin esperar un deploy
  const asset = (p) => (/^img\/[a-z0-9-]+\.webp$/i.test(String(p)) ? LIVE + encodeURIComponent(p) : String(p));
  function applyImages() {
    const im = (content && content.images) || {};
    const hero = $('#hero');
    if (im.hero) {
      $('#heroBg').src = asset(im.hero);
      // el recorte de la figura solo calza con la foto original
      if (hero) hero.classList.toggle('no-cut', im.hero !== HERO_DEFAULT);
    }
    if (im.bio) $('#bioImg').src = asset(im.bio);
    if (im.live) $('#liveImg').src = asset(im.live);
    if (im.riderDiagram) $('#riderDiagram').src = asset(im.riderDiagram);
    const rb = $('#riderBg');
    if (rb && im.riderBg) rb.style.backgroundImage = 'url("' + asset(im.riderBg).replace(/["\\]/g, '') + '")';
  }

  const handle = (url) => {
    try {
      const p = new URL(url).pathname.split('/').filter(Boolean);
      const h = p[0] || '';
      return h ? (h.charAt(0) === '@' ? h : '@' + h) : '';
    } catch (e) { return ''; }
  };

  function applyArtist() {
    const a = (content && content.artist) || {};
    const s = a.socials || {};
    const map = { soundcloud: s.soundcloud, instagram: s.instagram, youtube: s.youtube, presskit: a.pressKit, portfolio: a.portfolio };
    Object.keys(map).forEach((k) => {
      $$('[data-link="' + k + '"]').forEach((n) => {
        const url = (map[k] || '').trim();
        const li = n.closest('.channels li');
        if (!url) { (li || n).hidden = true; return; }
        (li || n).hidden = false;
        n.href = url;
      });
    });
    if (a.email) {
      $$('[data-link="email"]').forEach((n) => { n.href = 'mailto:' + a.email; });
      $$('[data-text="email"]').forEach((n) => { n.textContent = a.email; });
    }
    if (s.instagram) $$('[data-text="instagram"]').forEach((n) => { n.textContent = handle(s.instagram) + ' ↗'; });
    if (s.youtube) $$('[data-text="youtube"]').forEach((n) => { n.textContent = handle(s.youtube) + ' ↗'; });
    const foot = $('.about__foot');
    if (foot) foot.hidden = !(a.portfolio && a.portfolio.trim());
  }

  function applyStats() {
    const st = (content && content.stats) || {};
    $$('[data-stat]').forEach((n) => {
      const v = st[n.dataset.stat];
      if (v) n.textContent = String(v).toUpperCase();
    });
  }

  function applyGenres() {
    const g = (content && Array.isArray(content.genres) && content.genres.length) ? content.genres : null;
    if (!g) return;
    const tick = $('#ticker');
    if (tick) {
      tick.replaceChildren();
      for (let r = 0; r < 4; r++) g.forEach((name) => { tick.append(el('span', null, String(name).toUpperCase()), el('i', null, '✕')); });
    }
    const chips = $('#genreChips');
    if (chips) {
      chips.replaceChildren();
      g.forEach((name, i) => chips.append(el('span', 'chip' + (i === 0 ? ' chip--on' : ''), name)));
    }
  }

  function applyPromoters() {
    const list = (content && Array.isArray(content.promoters)) ? content.promoters.filter((p) => p && p.name) : null;
    if (!list) return;
    const grid = $('#hotcues');
    const freq = {};
    list.forEach((p) => { const m = (p.meta || '').trim(); if (m) freq[m] = (freq[m] || 0) + 1; });
    const home = Object.keys(freq).sort((x, y) => freq[y] - freq[x])[0];
    grid.replaceChildren();
    list.forEach((p, i) => {
      const li = el('li');
      li.style.setProperty('--i', i);
      const meta = (p.meta || '').trim();
      if (home && meta && meta !== home) li.classList.add('is-away');
      const letter = i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
      li.append(el('b', null, letter), el('span', 'm', meta), el('span', 'n', p.name));
      grid.append(li);
    });
    $('#hotcueCount').textContent = list.length <= 8 ? pad2(list.length) + ' / 08' : pad2(list.length);
    requestAnimationFrame(fitTexts);
    const cities = Object.keys(freq);
    if (cities.length) $('#liveCities').textContent = cities.join(' · ');
  }

  function applyComposed() {
    const hg = $('#heroGenres');
    if (hg && !hg._scrambling) slashList(hg, t('hero.subtitle'), /[./·|]+/);
    const bt = $('.booking__title');
    if (bt) {
      const v = plain(t('contact.title')).trim();
      const m = v.match(/^([\s\S]*?)([.!?¡¿…]+)$/);
      bt.replaceChildren();
      if (m && m[1]) { bt.append(m[1]); bt.append(el('em', null, m[2])); } else bt.textContent = v;
    }
    const sh = $('#sharedNames');
    if (sh) slashList(sh, t('live.shared'), /[,/·|]+/);
    const riderWrap = $('#rider .wrap');
    if (riderWrap) {
      const a = (content && content.artist) || {};
      riderWrap.setAttribute('data-print-foot', ['KEXXY', a.email, location.host].filter(Boolean).join(' · '));
    }
  }

  /* =====================================================================
     I · DECKS: cada set de SoundCloud con su video de YouTube (mismo orden que en el panel)
     ===================================================================== */
  const decks = [];
  let scApi = null;

  const ytId = (url) => {
    const s = String(url || '').trim();
    const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(s) ? s : null;
  };
  const pickText = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v.es || v[Object.keys(v).find((k) => v[k])] || '';
  };
  const fmtTime = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + pad2(m) : pad2(m)) + ':' + pad2(r);
  };

  // forma de onda determinística por set: siempre la misma para el mismo link
  function waveSVG(seedStr, idx) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const NS = 'http://www.w3.org/2000/svg';
    const svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'wave');
    svg.setAttribute('viewBox', '0 0 600 80');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const clipId = 'kx-clip-' + idx;
    const defs = D.createElementNS(NS, 'defs');
    const cp = D.createElementNS(NS, 'clipPath'); cp.id = clipId;
    const cr = D.createElementNS(NS, 'rect'); cr.setAttribute('x', '0'); cr.setAttribute('y', '0'); cr.setAttribute('width', '0'); cr.setAttribute('height', '80');
    cp.append(cr); defs.append(cp); svg.append(defs);
    const mid = D.createElementNS(NS, 'path'); mid.setAttribute('d', 'M0 40 H600'); mid.setAttribute('stroke', '#2a2c31'); mid.setAttribute('stroke-width', '1');
    svg.append(mid);
    const base = D.createElementNS(NS, 'g'); base.setAttribute('class', 'w-base'); base.setAttribute('stroke-width', '3');
    const play = D.createElementNS(NS, 'g'); play.setAttribute('class', 'w-play'); play.setAttribute('stroke-width', '3'); play.setAttribute('clip-path', 'url(#' + clipId + ')');
    const breaks = [0.18 + rnd() * 0.1, 0.52 + rnd() * 0.12];
    for (let i = 0; i < 100; i++) {
      const x = 3 + i * 6;
      const p = i / 99;
      let env = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, p * 1.15));
      if (breaks.some((b) => Math.abs(p - b) < 0.035)) env *= 0.35; // breakdowns
      const h = Math.max(4, Math.min(34, (0.35 + rnd() * 0.65) * 34 * env));
      [base, play].forEach((g, k) => {
        const ln = D.createElementNS(NS, 'line');
        ln.setAttribute('x1', x); ln.setAttribute('x2', x);
        ln.setAttribute('y1', (40 - h).toFixed(1)); ln.setAttribute('y2', (40 + h).toFixed(1));
        if (k === 0) { ln.setAttribute('class', 'w-bar'); ln.style.setProperty('--i', i); }
        g.append(ln);
      });
    }
    svg.append(base, play);
    const head = D.createElementNS(NS, 'line'); head.setAttribute('class', 'w-head');
    head.setAttribute('x1', '1'); head.setAttribute('x2', '1'); head.setAttribute('y1', '0'); head.setAttribute('y2', '80');
    const cue = D.createElementNS(NS, 'path'); cue.setAttribute('d', 'M1 0 L9 0 L1 8 Z'); cue.setAttribute('fill', '#e9e5dc');
    svg.append(head, cue);
    svg._set = (p) => {
      const x = Math.max(1, Math.min(599, p * 600));
      cr.setAttribute('width', String(p * 600));
      head.setAttribute('x1', x); head.setAttribute('x2', x);
      cue.style.display = p > 0.002 ? 'none' : '';
    };
    return svg;
  }

  function buildDecks() {
    const box = $('#decks');
    if (!box) return;
    const sets = ((content && content.sets) || []).map((s) => (typeof s === 'string' ? s : s && s.url)).filter(Boolean);
    const vids = ((content && content.videos) || []).filter((v) => v && ytId(v.url));
    const n = Math.max(sets.length, vids.length);
    decks.length = 0;
    box.replaceChildren();
    for (let i = 0; i < n; i++) {
      const d = { i, set: sets[i] || null, vid: vids[i] || null, widget: null, playing: false, started: false, dur: 0 };
      const art = el('article', 'deck');
      art.style.setProperty('--i', i);
      const top = el('div', 'deck__top');
      top.append(el('span', null, 'DECK ' + (i + 1) + ' · SET ' + pad2(i + 1)));
      const state = el('span', 'deck__state');
      state.append(el('i'), el('span', null, ''));
      top.append(state);
      const title = el('h3', 'deck__title');
      const desc = el('p', 'deck__desc');
      const screen = el('div', 'deck__screen');
      const wave = waveSVG(d.set || (d.vid && d.vid.url) || String(i), i);
      const clock = el('span', 'deck__clock', '00:00');
      clock.setAttribute('aria-hidden', 'true');
      const player = el('div', 'deck__player');
      screen.append(wave, clock, player);
      const meta = el('div', 'deck__meta');
      const mLabel = el('span'), mSrc = el('span', null, d.set ? 'SoundCloud' : 'YouTube'), mTime = el('span', null, '--:--');
      meta.append(mLabel, mSrc, mTime);
      const ctas = el('div', 'deck__ctas');
      let btn = null, yt = null;
      if (d.set) {
        btn = el('button', 'btn ' + (i === 0 ? 'btn--chrome' : 'btn--ghost') + ' deck__play');
        btn.type = 'button';
        btn.append(svgPlay(), el('span'));
        btn.addEventListener('click', () => toggleDeck(d));
        ctas.append(btn);
      }
      if (d.vid) {
        yt = el('a', 'btn btn--ghost');
        yt.href = 'https://youtu.be/' + ytId(d.vid.url);
        yt.target = '_blank'; yt.rel = 'noopener';
        yt.addEventListener('click', () => track('deck_youtube', { deck: i + 1 }));
        ctas.append(yt);
      }
      art.append(top, title, desc, screen, meta, ctas);
      box.append(art);
      Object.assign(d, { art, state, title, desc, wave, clock, player, mLabel, mTime, btn, yt });
      decks.push(d);
    }
    box.classList.add('stagger');
    textDecks();
    if (revealObs) { revealObs.observe(box); decks.forEach((d) => revealObs.observe(d.art)); }
  }

  function svgPlay() {
    const NS = 'http://www.w3.org/2000/svg';
    const s = D.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 10 12'); s.setAttribute('width', '10'); s.setAttribute('height', '12'); s.setAttribute('aria-hidden', 'true');
    const p = D.createElementNS(NS, 'path'); p.setAttribute('d', 'M0 0 L10 6 L0 12 Z');
    s.append(p);
    s._p = p;
    return s;
  }

  // "KEXXY — Hard Techno Set" → "Hard Techno Set": toda la página ya es de KEXXY
  function cleanTitle(s) {
    const name = String((content && content.artist && content.artist.name) || '').trim();
    if (!name) return s;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return s.replace(new RegExp('^\\s*' + esc + '\\s*[—–\\-:|·]\\s*', 'i'), '').trim() || s;
  }

  function textDecks() {
    const ytOn = sectionOn('videos');
    decks.forEach((d) => {
      const v = d.vid;
      d.title.textContent = cleanTitle((v && pickText(v.title)) || '') || 'SET ' + pad2(d.i + 1);
      d.desc.textContent = (v && pickText(v.desc)) || '';
      d.desc.hidden = !d.desc.textContent;
      d.mLabel.textContent = (v && pickText(v.label)) || 'DJ Set';
      const st = d.playing ? t('listen.playing') : (d.started ? t('listen.paused') : t('listen.cue'));
      d.state.lastChild.textContent = (d.playing ? '' : '◆ ') + st;
      d.art.classList.toggle('is-playing', d.playing);
      if (d.btn) {
        d.btn.lastChild.textContent = d.playing ? t('listen.paused') : t('hero.cta1');
        d.btn.firstChild._p.setAttribute('d', d.playing ? 'M0 0 H3.5 V12 H0 Z M6.5 0 H10 V12 H6.5 Z' : 'M0 0 L10 6 L0 12 Z');
        d.btn.setAttribute('aria-label', (d.playing ? t('listen.paused') : t('hero.cta1')) + ' — ' + d.title.textContent);
      }
      if (d.yt) { d.yt.textContent = plain(t('video.watchBtn')); d.yt.hidden = !ytOn; }
    });
  }

  function loadScApi() {
    if (scApi) return scApi;
    scApi = new Promise((res, rej) => {
      if (window.SC && window.SC.Widget) { res(window.SC); return; }
      const s = el('script');
      s.src = 'https://w.soundcloud.com/player/api.js';
      s.async = true;
      s.onload = () => (window.SC && window.SC.Widget ? res(window.SC) : rej(new Error('sc')));
      s.onerror = () => rej(new Error('sc'));
      D.head.append(s);
    });
    return scApi;
  }

  function toggleDeck(d) {
    if (d.widget && d.widget.api) {
      d.widget.api.toggle();
      return;
    }
    if (d.widget) return; // cargando
    track('deck_play', { deck: d.i + 1 });
    const f = el('iframe');
    f.title = 'SoundCloud — ' + d.title.textContent;
    f.allow = 'autoplay; encrypted-media';
    f.loading = 'eager';
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(d.set) +
      '&color=%23e0102d&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&show_artwork=false&visual=false';
    d.widget = { frame: f, api: null };
    d.player.append(f);
    d.art.classList.add('has-player');
    d.state.lastChild.textContent = t('listen.loading');
    loadScApi().then((SC) => {
      const w = SC.Widget(f);
      const E = SC.Widget.Events;
      d.widget.api = w;
      w.bind(E.READY, () => {
        w.getDuration((ms) => { d.dur = ms; d.mTime.textContent = fmtTime(ms); });
        textDecks(); // si el navegador bloqueó el autoplay, el deck queda en CUE con el player a la vista
      });
      w.bind(E.PLAY, () => {
        d.playing = true;
        d.started = true;
        decks.forEach((o) => { if (o !== d && o.playing && o.widget && o.widget.api) o.widget.api.pause(); });
        textDecks();
      });
      w.bind(E.PAUSE, () => { d.playing = false; textDecks(); });
      w.bind(E.FINISH, () => { d.playing = false; textDecks(); });
      w.bind(E.PLAY_PROGRESS, (e) => {
        const p = e.relativePosition || 0;
        d.wave._set(p);
        d.clock.textContent = fmtTime(e.currentPosition || 0);
      });
    }).catch(() => { d.state.lastChild.textContent = '◆ SoundCloud'; });
  }

  /* =====================================================================
     II · FECHAS (tracklist)
     ===================================================================== */
  const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let dateFilter = 'all';

  function renderDates() {
    const body = $('#datesBody');
    if (!body || !dates) return;
    const today = todayAR();
    const valid = dates.filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)));
    const up = valid.filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = valid.filter((x) => x.date < today).sort((a, b) => b.date.localeCompare(a.date));
    body.replaceChildren();
    up.concat(past).forEach((x, i) => {
      const isPast = x.date < today;
      const isToday = x.date === today;
      const [y, m, d] = x.date.split('-');
      const tr = el('tr');
      tr.dataset.kind = isPast ? 'past' : 'up';
      tr.style.setProperty('--i', i);
      if (isPast) tr.classList.add('is-past');
      if (isToday) tr.classList.add('is-today');
      const s = el('td', 's r');
      if (!isPast) s.append(el('i'));
      s.append(isToday ? t('dates.today') : isPast ? t('dates.past') : t('dates.upcoming'));
      const venue = el('td', 'v');
      const link = String(x.link || x.url || '').trim();
      if (/^https?:\/\//i.test(link)) {
        const a = el('a', null, x.venue || 'TBA');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        venue.append(a);
      } else {
        venue.textContent = x.venue || 'TBA';
      }
      tr.append(el('td', 'n', pad2(i + 1)), el('td', 'd', d + '.' + m + '.' + y.slice(2)), venue, el('td', 'c', x.city || ''), s);
      body.append(tr);
    });
    if (!up.length && !past.length) {
      const tr = el('tr', 'tracklist__empty');
      const td = el('td', null, t('dates.none'));
      td.colSpan = 5;
      tr.append(td);
      body.append(tr);
    }
    filterDates(dateFilter);
    requestAnimationFrame(fitTexts);
  }

  function filterDates(f) {
    dateFilter = f;
    $$('#dateFilters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    const rows = $$('#datesBody tr[data-kind]');
    let shown = 0;
    rows.forEach((r) => {
      const on = f === 'all' || r.dataset.kind === f;
      r.hidden = !on;
      if (on) shown++;
    });
    let empty = $('#datesBody .tracklist__empty--f');
    if (!shown && rows.length) {
      if (!empty) {
        empty = el('tr', 'tracklist__empty tracklist__empty--f');
        const td = el('td');
        td.colSpan = 5;
        empty.append(td);
        $('#datesBody').append(empty);
      }
      empty.firstChild.textContent = t('dates.none');
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }
  $$('#dateFilters button').forEach((b) => b.addEventListener('click', () => { filterDates(b.dataset.f); track('dates_filter', { filter: b.dataset.f }); }));

  /* =====================================================================
     IDIOMA
     ===================================================================== */
  function setLang(l, user) {
    if (langs.indexOf(l) === -1) l = langs[0];
    lang = l;
    root.lang = l;
    $$('.lang__b').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    applyTexts();
    applyComposed();
    textDecks();
    renderDates();
    fitTexts();
    if (user) { store.set('localStorage', 'kexxy-lang-user', l); track('language_change', { lang: l }); }
    store.set('localStorage', 'kexxy-lang', l);
  }
  $$('.lang__b').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  function resolveLangs() {
    const cfg = (content && content.languages) || {};
    const all = ['es', 'en', 'pt'];
    langs = Array.isArray(cfg.enabled) ? cfg.enabled.filter((x) => all.indexOf(x) !== -1) : all.slice();
    if (!langs.length) langs = ['es'];
    $$('.lang__b').forEach((b) => { b.hidden = langs.indexOf(b.dataset.lang) === -1; });
    $$('.lang').forEach((g) => { g.hidden = langs.length < 2; });
    const chosen = store.get('localStorage', 'kexxy-lang-user');
    if (chosen && langs.indexOf(chosen) !== -1) return chosen;
    const nav = String(navigator.language || '').toLowerCase();
    const guess = /^pt|-br$/.test(nav) ? 'pt' : /^es/.test(nav) ? 'es' : 'en';
    if (guess && langs.indexOf(guess) !== -1) return guess;
    return langs.indexOf(cfg.default) !== -1 ? cfg.default : langs[0];
  }

  /* =====================================================================
     CONTENIDO
     ===================================================================== */
  function applyIntegrations() {
    const ga = String((content && content.integrations && content.integrations.googleAnalytics) || '').trim();
    if (!ga || window.__gaLoaded) return;
    window.__gaLoaded = true;
    const s = el('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
    D.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga);
  }

  const getJSON = (url) => fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));
  /* Primero lo último que guardó el panel (leído del repo por /api/public, cacheado 1 min en el CDN);
     si la API no responde a tiempo o no está configurada, la copia estática del deploy. */
  function getLive(name) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 3500) : 0;
    return fetch(LIVE + encodeURIComponent(name), ctrl ? { signal: ctrl.signal } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(name))))
      .then((j) => { clearTimeout(timer); return j; })
      .catch(() => { clearTimeout(timer); return getJSON(name); });
  }

  function boot() {
    getLive('content.json').then((c) => {
      content = c;
      window.__kexxyContent = c; // el formulario y el panel lo leen
      applyIntegrations();
      const l = resolveLangs();
      applySections();
      applyImages();
      applyArtist();
      applyStats();
      applyGenres();
      applyPromoters();
      buildDecks();
      setLang(l, false);
      observeStagger();
    }).catch((e) => {
      // sin content.json la página queda en español con lo que trae el HTML
      console.error('content.json:', e);
      $$('.lang').forEach((g) => { g.hidden = true; });
      fitTexts();
    });

    getLive('dates.json').then((d) => {
      dates = Array.isArray(d) ? d : (d && Array.isArray(d.dates) ? d.dates : []);
      renderDates();
      observeStagger();
    }).catch(() => { /* quedan las filas del HTML */ });
  }

  /* =====================================================================
     REVELADO AL SCROLLEAR + SCRAMBLE DE TÍTULOS
     ===================================================================== */
  let revealObs = null;
  function setupReveal() {
    if (!('IntersectionObserver' in window) || reduced()) {
      $$('[data-reveal], .sec__head, .stagger, .deck').forEach((n) => n.classList.add('is-in'));
      return;
    }
    revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const n = e.target;
        n.classList.add('is-in');
        if (n.classList.contains('sec__head')) {
          const h = $('[data-scramble]', n);
          if (h) scramble(h, 650);
        }
        revealObs.unobserve(n);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('[data-reveal]').forEach((n) => { if (!n.closest('.hero')) revealObs.observe(n); });
    $$('.sec__head').forEach((n) => revealObs.observe(n));
  }
  function observeStagger() {
    ['#hotcues', '#datesBody'].forEach((s) => {
      const n = $(s);
      if (!n) return;
      Array.from(n.children).forEach((c, i) => c.style.setProperty('--i', i));
      n.classList.add('stagger');
      if (revealObs) revealObs.observe(n); else n.classList.add('is-in');
    });
    if (!revealObs) decks.forEach((d) => d.art.classList.add('is-in'));
  }

  /* =====================================================================
     CUE POINTS: resalta la sección que está sonando
     ===================================================================== */
  function setupCues() {
    const cues = $('#cues');
    if (!cues || !('IntersectionObserver' in window)) return;
    const links = $$('a[data-cue]', cues);
    const on = (id) => links.forEach((a) => a.classList.toggle('is-on', a.dataset.cue === id));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) on(e.target.id === 'hero' ? '' : e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['hero', 'sets', 'dates', 'bio', 'live', 'rider', 'booking'].forEach((id) => { const s = D.getElementById(id); if (s) io.observe(s); });
    links.forEach((a) => a.addEventListener('click', () => track('cue_click', { cue: a.dataset.cue })));
    // con el teclado del celu abierto, la barra de cues se esconde
    const form = $('#contactForm');
    if (form) {
      form.addEventListener('focusin', () => cues.classList.add('is-hidden'));
      form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(D.activeElement)) cues.classList.remove('is-hidden'); }, 60));
    }
  }

  /* =====================================================================
     RELOJ A 150 BPM + SIGILO WEBGL
     ===================================================================== */
  let T0 = performance.now();
  function startLive() {
    if (reduced() || root.classList.contains('is-live')) return;
    T0 = performance.now();
    root.classList.add('is-live');
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  function setupPointer() {
    if (reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const hero = $('#hero');
    const logo = $('#logo');
    let raf = 0;
    const step = () => {
      raf = 0;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      if (logo) logo.style.transform = 'perspective(900px) rotateY(' + (pointer.x * 6).toFixed(2) + 'deg) rotateX(' + (-pointer.y * 4).toFixed(2) + 'deg)';
      if (Math.abs(pointer.tx - pointer.x) > 0.002 || Math.abs(pointer.ty - pointer.y) > 0.002) raf = requestAnimationFrame(step);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(step); };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      go();
    });
    hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; go(); });
  }

  function webglOK() {
    try {
      const c = D.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  function setupGL() {
    const canvas = $('#sigilGL');
    const box = $('#heroSigil');
    const hero = $('#hero');
    if (!canvas || !box || reduced() || !webglOK()) return;
    const conn = navigator.connection || {};
    if (conn.saveData) return;
    const lowPower = window.matchMedia('(max-width: 899px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
    let gl = null, visible = true, raf = 0, failed = false;

    const size = () => {
      if (!gl) return;
      const r = box.getBoundingClientRect();
      const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) gl.setSize(w, h);
    };
    const loop = (now) => {
      raf = 0;
      if (!gl || !visible || D.hidden || failed) return;
      gl.render((now - T0) / 1000, { pointer: [pointer.x, pointer.y] });
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && gl && visible && !D.hidden) raf = requestAnimationFrame(loop); };

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); failed = true; box.classList.remove('gl-on'); });

    const url = new URL('sigil-gl.js?v=1', SCRIPT_URL).href;
    import(url).then((m) => m.mountSigil({
      canvas,
      svgUrl: 'assets/brand/kexxy-sigil.svg',
      normalUrl: 'assets/gl/sigil-normal.webp',
      lowPower
    })).then((g) => {
      gl = g;
      size();
      gl.render((performance.now() - T0) / 1000, {});
      requestAnimationFrame(() => box.classList.add('gl-on'));
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(box);
      else window.addEventListener('resize', size);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(hero);
      }
      D.addEventListener('visibilitychange', kick);
      kick();
    }).catch((e) => { console.warn('sigilo WebGL:', e); });
  }

  /* =====================================================================
     INTRO: logo rojo (video) → bombo → cromo → vuela a su lugar en el hero
     ===================================================================== */
  function revealHero(fromIntro) {
    startLive();
    root.classList.add('hero-in');
    if (!fromIntro && !reduced()) $('#heroLogo').classList.add('wipe');
    const items = $$('.hero__copy [data-reveal]');
    items.forEach((n, i) => {
      n.style.setProperty('--d', (fromIntro ? 0.5 : 0.9) + i * 0.12 + 's');
      if (n.id === 'heroGenres' || n.classList.contains('hero__kicker')) {
        setTimeout(() => scramble(n, 600, applyComposed), (fromIntro ? 500 : 900) + i * 120);
      }
    });
    setTimeout(setupGL, fromIntro ? 900 : 1400);
  }

  function runIntro() {
    if (!root.classList.contains('intro-on')) { revealHero(false); return; }
    store.set('sessionStorage', 'kx-intro', '1');
    const intro = $('#intro');
    const vid = $('#introBlood');
    const chrome = $('#introChrome');
    const flash = $('.intro__flash', intro);
    const skip = $('#introSkip');
    let stage = 0; // 0 cargando · 1 video · 2 cromo · 3 vuelo · 4 listo
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    startLive();

    function land() {
      if (stage === 4) return;
      stage = 4;
      timers.forEach(clearTimeout);
      root.classList.add('hero-in', 'logo-flown');
      root.classList.remove('intro-on');
      intro.remove();
      D.removeEventListener('keydown', onKey);
    }
    function skipAll() {
      if (stage >= 4) return;
      if (stage < 3) revealHero(true);
      land();
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipAll(); }
    }
    skip.tabIndex = 0;
    skip.addEventListener('click', skipAll);
    intro.addEventListener('click', (e) => { if (e.target !== skip) skipAll(); });
    D.addEventListener('keydown', onKey);

    function fly() {
      if (stage >= 3) return;
      stage = 3;
      const target = $('#heroLogo .logo__chrome');
      const a = chrome.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      intro.classList.add('is-open');
      revealHero(true);
      if (!a.width || !b.width || !chrome.animate) { later(land, 600); return; }
      const s = b.width / a.width;
      const anim = chrome.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: 'translate(' + (b.left - a.left) + 'px, ' + (b.top - a.top) + 'px) scale(' + s + ')' }
      ], { duration: 820, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' });
      anim.onfinish = land;
      later(land, 1200); // por si la animación no termina (pestaña en segundo plano)
    }

    function hit() {
      if (stage >= 2) return;
      stage = 2;
      flash.classList.add('is-hit');
      chrome.style.opacity = '1';
      vid.classList.remove('is-on');
      try { vid.pause(); } catch (e) { /* nada */ }
      later(fly, BEAT * 1000 * 1.5);
    }

    function play() {
      if (stage !== 0) return;
      stage = 1;
      vid.classList.add('is-on');
      const p = vid.play();
      if (p && p.catch) p.catch(() => hit());
      vid.addEventListener('ended', hit, { once: true });
      later(hit, 1750);
    }

    vid.addEventListener('error', () => { if (stage === 0) hit(); }, { once: true });
    vid.src = videoSrc('blood-intro');
    vid.preload = 'auto';
    try { vid.load(); } catch (e) { /* nada */ }
    if (vid.readyState >= 3) play();
    else {
      vid.addEventListener('canplaythrough', play, { once: true });
      vid.addEventListener('loadeddata', () => later(play, 250), { once: true });
      later(() => { if (stage === 0) hit(); }, 2200); // red lenta: saltamos directo al cromo
    }
  }

  /* =====================================================================
     CIERRE: el logo rojo vivo, solo cuando está a la vista
     ===================================================================== */
  function setupClosing() {
    const v = $('#closingBlood');
    if (!v || reduced() || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          if (!v.src) { v.src = videoSrc('blood-loop'); v.preload = 'auto'; }
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { rootMargin: '160px 0px' });
    io.observe(v);
  }

  /* =====================================================================
     FORMULARIO (EmailJS, credenciales en content.json > integrations)
     ===================================================================== */
  const FORM_MSGS = {
    es: { sending: 'Enviando…', sent: 'Mensaje enviado. Te respondemos en 48 horas.', invalid: 'Completá nombre, un email válido y el mensaje.', error: 'No se pudo enviar. Probá de nuevo o escribí por email.', noForm: 'El formulario todavía no está configurado. Escribí a' },
    en: { sending: 'Sending…', sent: 'Message sent. We will get back to you within 48 hours.', invalid: 'Fill in your name, a valid email and the message.', error: 'Could not send. Try again or write by email.', noForm: 'The form is not set up yet. Write to' },
    pt: { sending: 'Enviando…', sent: 'Mensagem enviada. Respondemos em até 48 horas.', invalid: 'Preencha nome, um e-mail válido e a mensagem.', error: 'Não foi possível enviar. Tente de novo ou escreva por e-mail.', noForm: 'O formulário ainda não está configurado. Escreva para' }
  };
  const fm = () => FORM_MSGS[lang] || FORM_MSGS.es;

  function toast(msg, kind, ms) {
    const box = $('#toasts');
    if (!box) return;
    const n = el('div', 'toast' + (kind === 'error' ? ' toast--error' : ''), msg);
    box.append(n);
    setTimeout(() => n.remove(), ms || 5000);
  }

  let emailjsLoad = null;
  function loadEmailJS() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (emailjsLoad) return emailjsLoad;
    emailjsLoad = new Promise((res, rej) => {
      const s = el('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.async = true;
      s.onload = () => (window.emailjs ? res(window.emailjs) : rej(new Error('emailjs')));
      s.onerror = () => { emailjsLoad = null; rej(new Error('emailjs')); };
      D.head.append(s);
    });
    return emailjsLoad;
  }

  function setupForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('focusin', () => { loadEmailJS().catch(() => {}); }, { once: true });
    $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => i.closest('.field') && i.closest('.field').classList.remove('is-bad')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const T = fm();
      const btn = $('button[type="submit"]', form);
      const label = $('span', btn);
      if ($('#cf-honeypot').value.trim() !== '') { form.reset(); toast(T.sent, 'ok', 5000); return; }
      const name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-message');
      let ok = true;
      [[name, name.value.trim() !== ''], [email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())], [msg, msg.value.trim() !== '']].forEach(([f, valid]) => {
        f.closest('.field').classList.toggle('is-bad', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { toast(T.invalid, 'error', 4500); return; }
      const cfg = (content && content.integrations && content.integrations.emailjs) || {};
      const to = (content && content.artist && content.artist.email) || '';
      if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
        toast(to ? T.noForm + ' ' + to : T.noForm, 'error', 8000);
        if (to) location.href = 'mailto:' + to;
        return;
      }
      const original = label.textContent;
      label.textContent = T.sending;
      btn.disabled = true;
      loadEmailJS().then((ejs) => {
        ejs.init({ publicKey: cfg.publicKey });
        return ejs.sendForm(cfg.serviceId, cfg.templateId, form);
      }).then(() => {
        form.reset();
        toast(T.sent, 'ok', 6000);
        track('form_submit', { form: 'booking' });
      }).catch(() => {
        toast(T.error, 'error', 6500);
      }).finally(() => {
        label.textContent = original;
        btn.disabled = false;
      });
    });
  }

  /* =====================================================================
     RIDER: imprimir / guardar en PDF solo el rider
     ===================================================================== */
  function setupPrint() {
    const b = $('#printRider');
    if (!b) return;
    b.addEventListener('click', () => {
      track('rider_print');
      D.body.classList.add('print-rider');
      const done = () => { D.body.classList.remove('print-rider'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      setTimeout(() => window.print(), 30);
      setTimeout(done, 60000);
    });
  }

  /* =====================================================================
     ATAJO AL PANEL: escribir "kexxy" en cualquier lado
     ===================================================================== */
  function setupAdminShortcut() {
    const SECRET = 'kexxy';
    let buf = '';
    D.addEventListener('keydown', (e) => {
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
      if (!e.key || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-SECRET.length);
      if (buf === SECRET) location.href = 'admin.html';
    });
  }

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  setupReveal();
  setupCues();
  setupPointer();
  setupClosing();
  setupForm();
  setupPrint();
  setupAdminShortcut();
  boot();
  (D.fonts && D.fonts.ready ? D.fonts.ready : Promise.resolve()).then(fitTexts);
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', runIntro, { once: true });
  else runIntro();

  RM.addEventListener && RM.addEventListener('change', () => { if (reduced()) root.classList.remove('is-live'); });
})();
