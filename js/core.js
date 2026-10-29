/* Núcleo compartido: utilidades, almacenamiento, pantallas, celebraciones y resultado de ronda. */
window.Peques = window.Peques || {};
(function (P) {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[randInt(0, arr.length - 1)];
  const shuffle = (arr) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // localStorage puede no existir o fallar (modo privado, vista previa): nunca rompe el juego
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (err) { console.warn('No se pudo guardar', key, err); return false; }
    },
  };

  function animate(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ---------- Pantallas ----------
  let current = 's-profile';
  const onShowHooks = [];
  function show(id) {
    current = id;
    $$('.screen').forEach((s) => { s.hidden = s.id !== id; });
    onShowHooks.forEach((fn) => fn(id));
    window.scrollTo(0, 0);
  }
  const onShow = (fn) => onShowHooks.push(fn);
  const currentScreen = () => current;

  // ---------- Celebraciones ----------
  const HAPPY = [['🤩', '¡Muy bien!'], ['🥳', '¡Genial!'], ['😎', '¡Crack!'], ['🌟', '¡Perfecto!'], ['🦄', '¡Bravo!']];
  const SAD = [['😢', '¡Oh, no!'], ['😭', '¡Casi!'], ['🥺', '¡Uy!']];
  let reactTimer = null;

  function react(kind, face, text) {
    const box = $('#react');
    $('#react-face').textContent = face;
    $('#react-text').textContent = text;
    box.className = 'react ' + kind;
    void box.offsetWidth;
    box.classList.add('show');
    clearTimeout(reactTimer);
    reactTimer = setTimeout(() => { box.className = 'react'; }, 1500);
  }

  function emojiConfetti(amount) {
    const box = document.createElement('div');
    box.className = 'emoji-confetti';
    for (let i = 0; i < amount; i++) {
      const s = document.createElement('span');
      s.textContent = pick(['🎉', '⭐', '🌟', '🎈', '💖', '✨']);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      s.style.animationDelay = Math.random() * .5 + 's';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  }

  function confetti(power = 1) {
    if (reducedMotion()) return;
    if (typeof window.confetti !== 'function') { emojiConfetti(Math.round(25 * power)); return; }
    const colors = ['#ff5d4f', '#ffc93c', '#27b36f', '#8b5cf6', '#ff8cc6', '#2f8cff'];
    window.confetti({ particleCount: Math.round(90 * power), spread: 80, origin: { y: .65 }, colors, scalar: 1.1 });
    if (power > 1) {
      setTimeout(() => window.confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: .7 }, colors }), 250);
      setTimeout(() => window.confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: .7 }, colors }), 400);
    }
  }

  function tears() {
    if (reducedMotion()) return;
    for (let i = 0; i < 6; i++) {
      const t = document.createElement('span');
      t.className = 'tear';
      t.textContent = '💧';
      t.style.left = (35 + Math.random() * 30) + 'vw';
      t.style.top = (35 + Math.random() * 10) + 'vh';
      t.style.animationDelay = (i * .15) + 's';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2200);
    }
  }

  /** Acierto: fanfarria, confeti, carita feliz y +estrellas. */
  function celebrate(stars = 1) {
    const [face, text] = pick(HAPPY);
    react('happy', face, text);
    P.sound.ok();
    confetti(1);
    if (stars) P.profiles.addStars(stars);
  }

  /** Fallo: música de pena, carita llorando y lágrimas. */
  function lament() {
    const [face, text] = pick(SAD);
    react('sad', face, text);
    P.sound.ko();
    tears();
  }

  // ---------- Rondas ----------
  function renderDots(container, total, results, index) {
    container.innerHTML = Array.from({ length: total }, (_, i) => {
      const r = results[i];
      const cls = r === true ? 'ok' : r === false ? 'ko' : i === index ? 'now' : '';
      return `<i class="${cls}"></i>`;
    }).join('');
  }

  /** Pantalla final común a todos los juegos. */
  function showResult({ game, score, total, again }) {
    const p = P.profiles.current();
    const name = p ? p.name : '';
    const ratio = total ? score / total : 0;
    P.profiles.saveBest(game, score, total);
    $('#res-face').textContent = ratio === 1 ? '🏆' : ratio >= .6 ? '🥳' : '💪';
    $('#res-title').textContent = `¡${score} de ${total}!`;
    const starCount = Math.round(ratio * 5);
    $('#res-stars').innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < starCount ? '' : 'off'}" style="animation-delay:${i * .12}s">⭐</span>`).join('');
    const msg = ratio === 1 ? `¡Todo perfecto, ${name}! Eres una estrella.`
      : ratio >= .6 ? `¡Muy bien, ${name}! Cada vez lo haces mejor.`
      : `¡Buen intento, ${name}! Practicando se aprende. ¿Otra vez?`;
    $('#res-msg').textContent = msg;
    resultAgain = again;
    show('s-result');
    P.voice.say(`${score} de ${total}. ${msg}`);
    if (ratio >= .6) { P.sound.win(); confetti(ratio === 1 ? 2 : 1); }
  }
  let resultAgain = null;
  const replay = () => resultAgain && resultAgain();

  Object.assign(P, {
    $, $$, randInt, pick, shuffle, esc, store, animate,
    show, onShow, currentScreen, celebrate, lament, confetti, renderDots, showResult, replay,
  });
})(window.Peques);
