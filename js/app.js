/* Arranque: pantalla de jugadores, menú de islas, barra superior y navegación entre juegos. */
(function (P) {
  'use strict';

  const GAME_SCREENS = ['s-donde', 's-mates', 's-sum', 's-mul-intro', 's-mul', 's-mapa', 's-result'];

  function faceHtml(p) {
    return `<span class="me-face" style="background:${p.color}">${p.avatar}</span>`;
  }

  // ---------- Jugadores ----------
  function renderPickers() {
    P.$('#avatars').innerHTML = P.profiles.AVATARS.map((e, i) => `
      <label class="pick"><input type="radio" name="avatar" value="${e}" aria-label="Avatar ${i + 1}"><span>${e}</span></label>`).join('');
    P.$('#colors').innerHTML = P.profiles.COLORS.map((c, i) => `
      <label class="pick"><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''} aria-label="Color ${i + 1}"><span style="background:${c}"></span></label>`).join('');
  }

  function renderWho() {
    const list = P.profiles.all();
    P.$('#who-wrap').hidden = list.length === 0;
    P.$('#form-title').textContent = list.length ? '…o crea un jugador nuevo' : '¡Hola! ¿Cómo te llamas?';
    P.$('#who-list').innerHTML = list.map((p) =>
      `<button class="btn who" data-id="${p.id}">${faceHtml(p)}${P.esc(p.name)} <small>⭐ ${p.stars || 0}</small></button>`).join('');
  }

  function onCreate(ev) {
    ev.preventDefault();
    const error = P.profiles.create({
      name: P.$('#f-name').value,
      avatar: P.$('input[name="avatar"]:checked')?.value,
      color: P.$('input[name="color"]:checked')?.value,
    });
    P.$('#f-error').textContent = error;
    if (error) { P.sound.ko(); return; }
    ev.target.reset();
    enter();
  }

  function enter() {
    P.prefs.resumeOnGesture();
    openMenu();
    const p = P.profiles.current();
    if (p) P.voice.say(`¡Hola, ${p.name}! ¿A qué jugamos?`);
  }

  // ---------- Menú ----------
  function openMenu() {
    const p = P.profiles.current();
    if (!p) { goProfiles(); return; }
    P.$('#menu-hello').textContent = `¡Hola, ${p.name}!`;
    P.$$('[data-best]').forEach((el) => {
      const best = (p.best || {})[el.dataset.best];
      el.textContent = best ? `Tu récord: ${best.score} de ${best.total} ⭐` : '¡Estrénalo!';
    });
    P.show('s-menu');
  }

  function goProfiles() {
    renderWho();
    P.show('s-profile');
  }

  // ---------- Barra superior ----------
  function refreshTopbar(screen) {
    const p = P.profiles.current();
    P.$('#topbar').hidden = !p || screen === 's-profile';
    if (!p) return;
    P.$('#me-face').textContent = p.avatar;
    P.$('#me-face').style.background = p.color;
    P.$('#me-name').textContent = p.name;
    P.$('#me-stars').textContent = `⭐ ${p.stars || 0}`;
    P.$('#btn-home').hidden = !GAME_SCREENS.includes(screen);
    P.$('#btn-music').setAttribute('aria-pressed', String(P.prefs.music()));
    P.$('#btn-voice').setAttribute('aria-pressed', String(P.prefs.voice()));
  }

  function bind() {
    P.$('#profile-form').addEventListener('submit', onCreate);
    P.$('#avatars').addEventListener('change', () => P.sound.pop());
    P.$('#who-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      if (!btn) return;
      P.profiles.select(btn.dataset.id);
      enter();
    });
    P.$('#btn-switch').addEventListener('click', goProfiles);
    P.$('#btn-home').addEventListener('click', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); openMenu(); });
    P.$('#btn-music').addEventListener('click', (e) => {
      const on = !P.prefs.music();
      P.prefs.setMusic(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });
    P.$('#btn-voice').addEventListener('click', (e) => {
      const on = !P.prefs.voice();
      P.prefs.setVoice(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      if (on) P.voice.say('¡Te leo las preguntas!');
    });
    P.$$('.island[data-game]').forEach((btn) => btn.addEventListener('click', () => {
      P.sound.pop();
      P.games[btn.dataset.game].start();
    }));
    P.$('#res-again').addEventListener('click', P.replay);
    P.$('#res-menu').addEventListener('click', openMenu);
    P.onShow(refreshTopbar);
    Object.values(P.games).forEach((g) => g.bind());
  }

  renderPickers();
  bind();
  document.addEventListener('pointerdown', () => P.prefs.resumeOnGesture(), { once: true });
  if (P.profiles.current()) openMenu(); else goProfiles();
})(window.Peques);
