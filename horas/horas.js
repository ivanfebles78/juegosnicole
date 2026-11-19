/* Juego de las Horas: une el reloj digital con las palabras, y las palabras con el reloj de agujas.
   Se puede arrastrar de una tarjeta a otra o tocar dos tarjetas seguidas. Usa el jugador de la Isla. */
(function (P) {
  'use strict';

  if (!P.profiles.current()) { location.replace('../'); return; }

  const { TIMES, I18N } = P.HORAS;
  const ROUND = 5;
  const LANG_KEY = 'peques.horas.idioma';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ALLOWED = new Set(['numeric-text', 'text-numeric', 'text-clock', 'clock-text']);

  let lang = P.store.get(LANG_KEY, 'es') === 'en' ? 'en' : 'es';
  let round = null; // { times, links: [{a, b}], errors: {id:n}, done: Set }
  let selected = null;
  let drag = null; // { card, x, y, line, moved }

  const tr = (key) => I18N[lang][key];
  const board = () => P.$('#clock-board');

  // ---------- Dibujo ----------
  function clockSvg(h, m) {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      const r1 = i % 3 === 0 ? 33 : 37;
      return `<line class="tick" x1="${Math.sin(a) * r1}" y1="${-Math.cos(a) * r1}" x2="${Math.sin(a) * 42}" y2="${-Math.cos(a) * 42}"/>`;
    }).join('');
    const nums = [[12, 0, -25], [3, 25, 0], [6, 0, 25], [9, -25, 0]].map(([n, x, y]) => `<text class="num" x="${x}" y="${y}">${n}</text>`).join('');
    const hourA = ((h % 12) + m / 60) * 30;
    const minA = m * 6;
    return `<svg class="clock-face" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle class="face" r="46"/>${ticks}${nums}
      <line class="hour" x1="0" y1="0" x2="0" y2="-20" transform="rotate(${hourA})"/>
      <line class="minute" x1="0" y1="0" x2="0" y2="-33" transform="rotate(${minA})"/>
      <circle class="pin" r="4"/></svg>`;
  }

  function cardHtml(t, col) {
    const label = col === 'numeric' ? t.numeric : col === 'text' ? t[lang] : `${t.numeric}`;
    const body = col === 'clock' ? clockSvg(t.hour, t.minute) : P.esc(label);
    const cls = col === 'numeric' ? 't-card digital' : 't-card';
    const aria = col === 'clock' ? 'Reloj con agujas' : label;
    return `<button type="button" class="${cls}" data-id="${t.id}" data-col="${col}" aria-label="${P.esc(aria)}">${body}</button>`;
  }

  function setStatus(text, kind = '') {
    const el = P.$('#status-msg');
    el.className = 'tip' + (kind ? ' ' + kind : '');
    el.textContent = text;
  }

  // Coordenadas de una tarjeta respecto al tablero: el borde que mira hacia la otra tarjeta
  function anchor(card, towardsX) {
    const b = board().getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const right = towardsX >= r.left + r.width / 2;
    return { x: (right ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
  }

  function makeLine(cls, p1, p2) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', cls);
    setLine(line, p1, p2);
    P.$('#links').appendChild(line);
    return line;
  }
  function setLine(line, p1, p2) {
    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
  }
  const centerX = (c) => { const r = c.getBoundingClientRect(); return r.left + r.width / 2; };
  const lineBetween = (a, b) => [anchor(a, centerX(b)), anchor(b, centerX(a))];

  function redrawLinks() {
    if (!round) return;
    P.$$('#links .good').forEach((l) => l.remove());
    round.links.forEach(({ a, b }) => makeLine('good', ...lineBetween(a, b)));
  }

  // ---------- Ronda ----------
  function newRound() {
    const times = P.shuffle(TIMES).slice(0, ROUND);
    round = { times, links: [], errors: {}, done: new Set() };
    selected = null;
    P.$('#col-numeric').innerHTML = P.shuffle(times).map((t) => cardHtml(t, 'numeric')).join('');
    P.$('#col-text').innerHTML = P.shuffle(times).map((t) => cardHtml(t, 'text')).join('');
    P.$('#col-clock').innerHTML = P.shuffle(times).map((t) => cardHtml(t, 'clock')).join('');
    P.$('#links').innerHTML = '';
    setStatus(tr('start'));
    renderDots();
    P.show('s-horas');
  }

  function renderDots() {
    const results = round.times.filter((t) => round.done.has(t.id)).map((t) => !round.errors[t.id]);
    P.renderDots(P.$('#horas-dots'), ROUND, results, results.length);
  }

  const hasLink = (a, b) => round.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  const timeOf = (id) => round.times.find((t) => t.id === id);

  function sayTime(id) {
    if (lang === 'es') P.voice.say(timeOf(id).es);
  }

  function attempt(c1, c2) {
    const col1 = c1.dataset.col;
    const col2 = c2.dataset.col;
    if (col1 === col2) { setStatus(tr('wrongColumn'), 'ko'); P.sound.tap(); return; }
    if (!ALLOWED.has(`${col1}-${col2}`)) { setStatus(tr('order'), 'ko'); P.sound.tap(); return; }
    if (hasLink(c1, c2)) return;

    if (c1.dataset.id !== c2.dataset.id) {
      const bad = makeLine('bad', ...lineBetween(c1, c2));
      setTimeout(() => bad.remove(), 900);
      [c1, c2].forEach((c) => P.animate(c, 'shake'));
      round.errors = { ...round.errors, [c1.dataset.id]: 1, [c2.dataset.id]: 1 };
      setStatus(tr('wrong'), 'ko');
      P.lament();
      return;
    }

    const id = c1.dataset.id;
    round.links = [...round.links, { a: c1, b: c2 }];
    makeLine('good', ...lineBetween(c1, c2));
    c1.classList.add('linked');
    c2.classList.add('linked');
    const parts = P.$$(`.t-card[data-id="${id}"]`);
    const complete = round.links.filter((l) => l.a.dataset.id === id).length >= 2;
    if (!complete) {
      setStatus(tr('good'), 'ok');
      P.sound.ok();
      sayTime(id);
      return;
    }
    const done = new Set(round.done);
    done.add(id);
    round = { ...round, done };
    parts.forEach((c) => { c.classList.add('locked'); c.disabled = true; });
    renderDots();
    sayTime(id);
    P.celebrate(round.errors[id] ? 0 : 1);
    if (done.size === ROUND) {
      setStatus(tr('allDone'), 'ok');
      setTimeout(finish, 1700);
    } else {
      setStatus(tr('triplet'), 'ok');
    }
  }

  function finish() {
    const score = round.times.filter((t) => round.done.has(t.id) && !round.errors[t.id]).length;
    P.showResult({ game: 'horas', score, total: ROUND, again: newRound });
  }

  // ---------- Arrastrar o tocar ----------
  function select(card) {
    if (selected) selected.classList.remove('selected');
    selected = card;
    if (card) card.classList.add('selected');
  }

  function onDown(e) {
    const card = e.target.closest('.t-card');
    if (!card || card.disabled) return;
    e.preventDefault();
    const start = anchor(card, e.clientX);
    drag = { card, x: e.clientX, y: e.clientY, moved: false, line: makeLine('temp', start, start) };
  }

  function onMove(e) {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    const b = board().getBoundingClientRect();
    setLine(drag.line, anchor(drag.card, e.clientX), { x: e.clientX - b.left, y: e.clientY - b.top });
  }

  function onUp(e) {
    if (!drag) return;
    const { card, moved, line } = drag;
    drag = null;
    line.remove();
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.t-card');
    if (moved && target && target !== card && !target.disabled) { select(null); attempt(card, target); return; }
    if (moved) return;
    // Toque sin arrastrar: primera tarjeta queda elegida; la segunda intenta unirlas
    if (selected && selected !== card) { const first = selected; select(null); attempt(first, card); return; }
    select(selected === card ? null : card);
    P.sound.tap();
    if (card.dataset.col !== 'numeric') sayTime(card.dataset.id);
  }

  // ---------- Idioma y ayuda ----------
  function applyLang() {
    const ids = { 'title-text': 'title', 'col-numeric-title': 'colNumeric', 'col-text-title': 'colText', 'col-clock-title': 'colClock',
      'help-btn': 'help', 'new-round-btn': 'newRound', 'finish-btn': 'finish', 'help-title': 'helpTitle', 'help-intro': 'helpIntro',
      'help-quarter': 'helpQuarter', 'help-half': 'helpHalf', 'help-to': 'helpTo', 'help-oclock': 'helpOclock' };
    Object.entries(ids).forEach(([id, key]) => { P.$('#' + id).textContent = tr(key); });
    P.$$('#lang-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.lang === lang)));
    P.$$('.t-card[data-col="text"]').forEach((c) => {
      const t = timeOf(c.dataset.id);
      c.textContent = t[lang];
      c.setAttribute('aria-label', t[lang]);
    });
    document.documentElement.lang = lang;
    requestAnimationFrame(redrawLinks);
    if (!round || round.done.size < ROUND) setStatus(tr('start'));
  }

  function toggleHelp(open) {
    P.$('#help').hidden = !open;
    if (open && lang === 'es') P.voice.say(tr('helpIntro'));
  }

  // ---------- Barra superior ----------
  function refreshTopbar() {
    const p = P.profiles.current();
    P.$('#me-face').textContent = p.avatar;
    P.$('#me-face').style.background = p.color;
    P.$('#me-name').textContent = p.name;
    P.$('#me-stars').textContent = `⭐ ${p.stars || 0}`;
    P.$('#btn-music').setAttribute('aria-pressed', String(P.prefs.music()));
    P.$('#btn-voice').setAttribute('aria-pressed', String(P.prefs.voice()));
  }

  function bind() {
    const b = board();
    b.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', () => { if (drag) { drag.line.remove(); drag = null; } });
    window.addEventListener('resize', redrawLinks);

    P.$('#lang-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-lang]');
      if (!chip) return;
      lang = chip.dataset.lang;
      P.store.set(LANG_KEY, lang);
      applyLang();
    });
    P.$('#help-btn').addEventListener('click', () => toggleHelp(true));
    P.$('#help-close').addEventListener('click', () => toggleHelp(false));
    P.$('#help').addEventListener('click', (e) => { if (e.target.id === 'help') toggleHelp(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleHelp(false); });
    P.$('#new-round-btn').addEventListener('click', newRound);
    P.$('#finish-btn').addEventListener('click', finish);
    P.$('#res-again').addEventListener('click', P.replay);

    P.$('#btn-music').addEventListener('click', (e) => {
      const on = !P.prefs.music();
      P.prefs.setMusic(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });
    P.$('#btn-voice').addEventListener('click', (e) => {
      const on = !P.prefs.voice();
      P.prefs.setVoice(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });
    P.onShow(refreshTopbar);
    document.addEventListener('pointerdown', () => P.prefs.resumeOnGesture(), { once: true });
  }

  bind();
  newRound();
  applyLang();
})(window.Peques);
