/* Mi cuerpo en francés: aprender las partes del cuerpo con «Tête, épaules, genoux et pieds».
   Usa el jugador elegido en la Isla de Juegos (nombre y avatar se eligen una sola vez). */
(function (P) {
  'use strict';

  if (!P.profiles.current()) { location.replace('../'); return; }

  const PARTS = {
    tete: { fr: 'la tête', es: 'la cabeza', touch: 'Touche ta tête !' },
    epaules: { fr: 'les épaules', es: 'los hombros', touch: 'Touche tes épaules !' },
    genoux: { fr: 'les genoux', es: 'las rodillas', touch: 'Touche tes genoux !' },
    pieds: { fr: 'les pieds', es: 'los pies', touch: 'Touche tes pieds !' },
    yeux: { fr: 'les yeux', es: 'los ojos', touch: 'Touche tes yeux !' },
    oreilles: { fr: 'les oreilles', es: 'las orejas', touch: 'Touche tes oreilles !' },
    bouche: { fr: 'la bouche', es: 'la boca', touch: 'Touche ta bouche !' },
    nez: { fr: 'le nez', es: 'la nariz', touch: 'Touche ton nez !' },
  };
  const KEYS = Object.keys(PARTS);

  // Cada trozo de la canción ilumina su parte del cuerpo
  const CHORUS = { chunks: [['Tête,', 'tete'], ['épaules,', 'epaules'], ['genoux', 'genoux'], ['et pieds,', 'pieds']], es: 'Cabeza, hombros, rodillas y pies,' };
  const TAG = { chunks: [['genoux', 'genoux'], ['et pieds !', 'pieds']], es: 'rodillas y pies.' };
  const SONG = [
    CHORUS, TAG, CHORUS, TAG,
    { chunks: [["J'ai deux yeux,", 'yeux'], ['deux oreilles,', 'oreilles']], es: 'Tengo dos ojos, dos orejas,' },
    { chunks: [['une bouche', 'bouche'], ['et un nez.', 'nez']], es: 'una boca y una nariz.' },
    CHORUS, TAG,
  ];

  // ---------- Voz en francés ----------
  // Audios grabados con una voz francesa nativa (scripts/generar-audio-frances.py): así la pronunciación
  // no depende de las voces del aparato, que a menudo solo tiene la española.
  const slug = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // Se reproducen con Web Audio recortando el silencio de antes y después, para que la canción tenga ritmo.
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  function audioCtx() {
    if (!actx && AC) actx = new AC();
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  const SILENCE = 0.012;
  const PAD = 0.03;
  /** Devuelve el búfer y el tramo con voz (sin silencios). */
  function trim(buf) {
    const data = buf.getChannelData(0);
    let a = 0;
    let b = data.length - 1;
    while (a < data.length && Math.abs(data[a]) < SILENCE) a++;
    while (b > a && Math.abs(data[b]) < SILENCE) b--;
    const start = Math.max(0, a / buf.sampleRate - PAD);
    const end = Math.min(buf.duration, b / buf.sampleRate + PAD);
    return { buf, start, dur: Math.max(0.05, end - start) };
  }
  const clips = new Map();
  function clip(text) {
    const src = `audio/${slug(text)}.mp3`;
    if (!clips.has(src)) {
      const ctx = audioCtx();
      const loading = !ctx ? Promise.reject(new Error('Sin Web Audio')) : fetch(src)
        .then((r) => { if (!r.ok) throw new Error(`${src}: ${r.status}`); return r.arrayBuffer(); })
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(trim);
      loading.catch(() => clips.delete(src)); // si falla, se reintenta la próxima vez
      clips.set(src, loading);
    }
    return clips.get(src);
  }

  // Respaldo solo si falta el audio: la voz del aparato, y únicamente si es francesa de verdad
  const canSpeak = 'speechSynthesis' in window;
  let frVoice = null;
  function findFrVoice() {
    try { frVoice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr')) || null; }
    catch (err) { frVoice = null; }
  }
  if (canSpeak) { findFrVoice(); speechSynthesis.addEventListener?.('voiceschanged', findFrVoice); }
  function speakFallback(text, speed, done) {
    if (!canSpeak || !frVoice) { setTimeout(done, 600); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = frVoice.lang;
      u.voice = frVoice;
      u.rate = speed * 0.9;
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
    } catch (err) { setTimeout(done, 600); }
  }

  let playing = null;
  let token = 0;
  /** Corta cualquier audio o voz que esté sonando. */
  function hush() {
    token++;
    if (playing) {
      try { playing.onended = null; playing.stop(); } catch (err) { /* ya había terminado */ }
      playing = null;
    }
    if (canSpeak) { try { speechSynthesis.cancel(); } catch (err) { /* sin voz */ } }
  }
  /** Dice un texto en francés (corta lo anterior). speed: 1 normal, >1 más rápido. */
  function fr(text, { speed = 1, onend } = {}) {
    hush();
    audioCtx(); // reanuda el audio dentro del toque, como exigen iPad y iPhone
    const mine = token;
    const done = () => { if (mine !== token) return; playing = null; if (onend) onend(); };
    clip(text).then(({ buf, start, dur }) => {
      if (mine !== token) return;
      const src = actx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = speed;
      src.connect(actx.destination);
      src.onended = done;
      src.start(0, start, dur);
      playing = src;
    }).catch((err) => {
      console.warn('Audio en francés no disponible', err);
      if (mine === token) speakFallback(text, speed, done);
    });
  }
  /** Carga de antemano todos los audios para que no haya esperas. */
  function preload() { [...KEYS.map((k) => PARTS[k].fr), ...KEYS.map((k) => PARTS[k].touch), ...SONG.flatMap((l) => l.chunks.map(([t]) => t))].forEach((t) => clip(t).catch(() => {})); }
  const sayOne = (text) => fr(text);
  /** Dice varias palabras seguidas. */
  function sayList(texts) {
    const next = (i) => { if (i < texts.length) fr(texts[i], { onend: () => setTimeout(() => next(i + 1), 350) }); };
    next(0);
  }

  // ---------- Muñeco ----------
  const FIGURE = `
  <svg class="body-svg" viewBox="0 0 220 400" role="group" aria-label="Niño con las partes del cuerpo">
    <rect x="30" y="150" width="24" height="104" rx="12" class="shirt"/>
    <rect x="166" y="150" width="24" height="104" rx="12" class="shirt"/>
    <circle cx="42" cy="264" r="12" class="skin"/><circle cx="178" cy="264" r="12" class="skin"/>
    <rect x="78" y="268" width="26" height="94" class="skin"/>
    <rect x="116" y="268" width="26" height="94" class="skin"/>
    <rect x="102" y="120" width="16" height="24" class="skin"/>
    <rect x="56" y="140" width="108" height="112" rx="24" class="shirt"/>
    <rect x="62" y="236" width="96" height="44" rx="12" class="shorts"/>
    ${part('epaules', '<circle cx="62" cy="152" r="20" class="fill shirt2"/><circle cx="158" cy="152" r="20" class="fill shirt2"/>')}
    ${part('genoux', '<circle cx="91" cy="316" r="16" class="fill skin2"/><circle cx="129" cy="316" r="16" class="fill skin2"/>')}
    ${part('pieds', '<ellipse cx="86" cy="372" rx="28" ry="14" class="fill shoe"/><ellipse cx="134" cy="372" rx="28" ry="14" class="fill shoe"/>')}
    ${part('oreilles', '<ellipse cx="58" cy="80" rx="11" ry="16" class="fill skin2"/><ellipse cx="162" cy="80" rx="11" ry="16" class="fill skin2"/>')}
    ${part('tete', '<circle cx="110" cy="76" r="52" class="fill skin"/><path d="M60 68 Q62 20 110 20 Q158 20 160 68 Q146 40 110 42 Q74 40 60 68 Z" class="hair"/>')}
    ${part('yeux', '<circle cx="90" cy="72" r="16" class="hit"/><circle cx="130" cy="72" r="16" class="hit"/><circle cx="90" cy="72" r="9" class="fill eye"/><circle cx="130" cy="72" r="9" class="fill eye"/><circle cx="91" cy="73" r="4.5" class="pupil"/><circle cx="131" cy="73" r="4.5" class="pupil"/>')}
    ${part('nez', '<circle cx="110" cy="90" r="12" class="hit"/><ellipse cx="110" cy="90" rx="6" ry="5" class="fill nose"/>')}
    ${part('bouche', '<ellipse cx="110" cy="108" rx="20" ry="10" class="hit"/><path d="M96 104 Q110 118 124 104 Z" class="fill mouth"/>')}
  </svg>`;
  function part(key, shapes) {
    return `<g class="part" data-part="${key}" tabindex="0" role="button" aria-label="${PARTS[key].fr}">${shapes}</g>`;
  }

  function mountFigure(box, onPart) {
    box.innerHTML = FIGURE;
    if (!onPart) {
      box.classList.add('static');
      box.querySelectorAll('.part').forEach((g) => { g.removeAttribute('tabindex'); g.removeAttribute('role'); });
      return;
    }
    box.addEventListener('click', (e) => {
      const g = e.target.closest('[data-part]');
      if (g) onPart(g.dataset.part);
    });
    box.addEventListener('keydown', (e) => {
      const g = e.target.closest('[data-part]');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPart(g.dataset.part); }
    });
  }
  const partsOf = (box) => [...box.querySelectorAll('.part')];
  function glow(box, key) { partsOf(box).forEach((g) => g.classList.toggle('glow', g.dataset.part === key)); }
  function clearMarks(box) { partsOf(box).forEach((g) => g.classList.remove('glow', 'wrong', 'hint')); }
  function flashWrong(box, key) {
    const g = box.querySelector(`[data-part="${key}"]`);
    if (!g) return;
    g.classList.add('wrong');
    setTimeout(() => g.classList.remove('wrong'), 700);
  }

  // ---------- Aprende ----------
  const learnBox = P.$('#learn-fig');
  let seen = new Set();
  let learnCurrent = null;

  function renderChips() {
    P.$('#learn-chips').innerHTML = KEYS.map((k) =>
      `<button class="word-chip${seen.has(k) ? ' seen' : ''}" data-k="${k}" aria-pressed="${k === learnCurrent}">${P.esc(PARTS[k].fr)}</button>`).join('');
  }
  function learnPick(key) {
    P.sound.tap();
    learnCurrent = key;
    seen = new Set([...seen, key]);
    glow(learnBox, key);
    P.$('#learn-fr').textContent = PARTS[key].fr;
    P.$('#learn-es').textContent = PARTS[key].es;
    sayOne(PARTS[key].fr);
    renderChips();
    P.$('#learn-done').hidden = seen.size < KEYS.length;
  }
  function startLearn() {
    seen = new Set();
    learnCurrent = null;
    clearMarks(learnBox);
    P.$('#learn-fr').textContent = 'Touche !';
    P.$('#learn-es').textContent = 'Toca una parte del cuerpo del niño';
    P.$('#learn-done').hidden = true;
    renderChips();
    P.show('s-learn');
    P.voice.say('Toca una parte del cuerpo y escucha cómo se dice en francés.');
  }

  // ---------- Canción ----------
  const songBox = P.$('#song-fig');
  let songRun = 0;
  let singing = false;
  let songRate = 1;

  function renderLyrics() {
    P.$('#lyrics').innerHTML = SONG.map((line, li) =>
      `<p class="lyric">${line.chunks.map(([t], ci) => `<span class="chunk" data-l="${li}" data-c="${ci}">${P.esc(t)}</span>`).join(' ')}` +
      `<span class="es">${P.esc(line.es)}</span></p>`).join('');
  }
  function clearChunks() { P.$$('#lyrics .chunk.on').forEach((el) => el.classList.remove('on')); }
  function stopSong() {
    songRun++;
    singing = false;
    hush();
    clearChunks();
    clearMarks(songBox);
    P.$('#song-play').textContent = '▶ ¡A cantar!';
  }
  function playSong() {
    stopSong();
    const run = songRun;
    singing = true;
    P.$('#song-msg').textContent = '';
    P.$('#song-play').textContent = '⏹ Parar';
    const steps = SONG.flatMap((line, li) => line.chunks.map(([text, key], ci) => ({ text, key, li, ci })));
    const pause = songRate > 1 ? 0 : 180;
    let i = 0;
    const step = () => {
      if (run !== songRun) return;
      clearChunks();
      if (i >= steps.length) { finishSong(); return; }
      const s = steps[i];
      P.$(`#lyrics .chunk[data-l="${s.li}"][data-c="${s.ci}"]`).classList.add('on');
      glow(songBox, s.key);
      i++;
      fr(s.text, { speed: songRate, onend: () => setTimeout(step, pause) });
    };
    step();
  }
  function finishSong() {
    const fast = songRate > 1;
    stopSong();
    P.$('#song-msg').textContent = fast ? '¡Uf, qué rápido! ¡Bravo! 🥳' : '¡Muy bien! ¿Te atreves con la versión rápida? 🐇';
    P.sound.win();
    if (fast) P.confetti(1);
  }
  function startSong() {
    renderLyrics();
    P.$('#song-msg').textContent = '';
    P.show('s-song');
  }

  // ---------- Juego: ¡Toca! ----------
  const touchBox = P.$('#touch-fig');
  let tr = null;

  function touchRender() {
    const key = tr.order[tr.i];
    clearMarks(touchBox);
    P.$('#touch-title').textContent = `¡Toca! ${tr.i + 1} de ${tr.order.length}`;
    P.$('#touch-fr').textContent = PARTS[key].touch;
    P.$('#touch-es').textContent = '';
    const fb = P.$('#touch-fb');
    fb.className = 'feedback';
    fb.textContent = '';
    P.$('#touch-next').hidden = true;
    P.renderDots(P.$('#touch-dots'), tr.order.length, tr.results, tr.i);
    sayOne(PARTS[key].touch);
  }
  function touchAnswer(key) {
    if (!tr || tr.answered) return;
    const want = tr.order[tr.i];
    const fb = P.$('#touch-fb');
    if (key === want) {
      const first = tr.tries === 0;
      tr = { ...tr, answered: true, results: [...tr.results, first] };
      clearMarks(touchBox);
      glow(touchBox, key);
      fb.className = 'feedback ok';
      fb.innerHTML = `¡Oui! <small><b>${P.esc(PARTS[key].fr)}</b> = ${P.esc(PARTS[key].es)}</small>`;
      if (first) P.celebrate(1); else P.sound.ok();
      P.renderDots(P.$('#touch-dots'), tr.order.length, tr.results, tr.i);
      P.$('#touch-next').hidden = false;
      sayOne(PARTS[key].fr);
      return;
    }
    tr = { ...tr, tries: tr.tries + 1 };
    P.lament();
    flashWrong(touchBox, key);
    fb.className = 'feedback ko';
    fb.innerHTML = `Eso es <b>${P.esc(PARTS[key].fr)}</b> <small>(${P.esc(PARTS[key].es)}). ¡Prueba otra vez!</small>`;
    if (tr.tries >= 2) touchBox.querySelector(`[data-part="${want}"]`).classList.add('hint');
  }
  function touchNext() {
    if (tr.i + 1 >= tr.order.length) {
      P.showResult({ game: 'frances', score: tr.results.filter(Boolean).length, total: tr.order.length, again: startTouch });
      return;
    }
    tr = { ...tr, i: tr.i + 1, tries: 0, answered: false };
    touchRender();
  }
  function startTouch() {
    tr = { order: P.shuffle(KEYS), i: 0, results: [], tries: 0, answered: false };
    P.show('s-touch');
    touchRender();
  }

  // ---------- Juego: ¿Cómo se dice? ----------
  const nameBox = P.$('#name-fig');
  let nr = null;

  function nameRender() {
    const key = nr.order[nr.i];
    clearMarks(nameBox);
    glow(nameBox, key);
    P.$('#name-title').textContent = `¿Cómo se dice? ${nr.i + 1} de ${nr.order.length}`;
    P.$('#name-answers').innerHTML = nr.options.map((k) => `<button class="answer" data-k="${k}">${P.esc(PARTS[k].fr)}</button>`).join('');
    const fb = P.$('#name-fb');
    fb.className = 'feedback';
    fb.textContent = '';
    P.$('#name-next').hidden = true;
    P.renderDots(P.$('#name-dots'), nr.order.length, nr.results, nr.i);
  }
  const optionsFor = (key) => P.shuffle([key, ...P.shuffle(KEYS.filter((k) => k !== key)).slice(0, 2)]);
  function nameAnswer(btn) {
    if (!nr || nr.answered || btn.disabled) return;
    const want = nr.order[nr.i];
    const key = btn.dataset.k;
    const fb = P.$('#name-fb');
    if (key === want) {
      const first = nr.tries === 0;
      nr = { ...nr, answered: true, results: [...nr.results, first] };
      btn.classList.add('ok');
      P.$$('#name-answers .answer').forEach((b) => { b.disabled = true; });
      fb.className = 'feedback ok';
      fb.innerHTML = `¡Oui! <small><b>${P.esc(PARTS[key].fr)}</b> = ${P.esc(PARTS[key].es)}</small>`;
      if (first) P.celebrate(1); else P.sound.ok();
      P.renderDots(P.$('#name-dots'), nr.order.length, nr.results, nr.i);
      P.$('#name-next').hidden = false;
      sayOne(PARTS[key].fr);
      return;
    }
    nr = { ...nr, tries: nr.tries + 1 };
    btn.classList.add('ko');
    btn.disabled = true;
    P.lament();
    fb.className = 'feedback ko';
    fb.innerHTML = `No, <b>${P.esc(PARTS[key].fr)}</b> <small>es «${P.esc(PARTS[key].es)}». ¡Prueba otra vez!</small>`;
  }
  function nameNext() {
    if (nr.i + 1 >= nr.order.length) {
      P.showResult({ game: 'frances', score: nr.results.filter(Boolean).length, total: nr.order.length, again: startName });
      return;
    }
    const i = nr.i + 1;
    nr = { ...nr, i, tries: 0, answered: false, options: optionsFor(nr.order[i]) };
    nameRender();
  }
  function startName() {
    const order = P.shuffle(KEYS);
    nr = { order, i: 0, results: [], tries: 0, answered: false, options: optionsFor(order[0]) };
    P.show('s-name');
    nameRender();
    P.voice.say('¿Cómo se dice en francés la parte amarilla?');
  }

  // ---------- Barra superior y navegación ----------
  function refreshTopbar(screen) {
    const p = P.profiles.current();
    P.$('#me-face').textContent = p.avatar;
    P.$('#me-face').style.background = p.color;
    P.$('#me-name').textContent = p.name;
    P.$('#me-stars').textContent = `⭐ ${p.stars || 0}`;
    P.$('#btn-back').hidden = screen === 's-menu';
    P.$('#btn-music').setAttribute('aria-pressed', String(P.prefs.music()));
    P.$('#btn-voice').setAttribute('aria-pressed', String(P.prefs.voice()));
  }

  const START = { learn: startLearn, song: startSong, touch: startTouch, name: startName };

  function bind() {
    mountFigure(learnBox, learnPick);
    mountFigure(songBox, (key) => { stopSong(); glow(songBox, key); sayOne(PARTS[key].fr); });
    mountFigure(touchBox, touchAnswer);
    mountFigure(nameBox, null);

    P.$$('[data-go]').forEach((btn) => btn.addEventListener('click', () => { P.sound.pop(); START[btn.dataset.go](); }));
    P.$('#learn-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) learnPick(b.dataset.k); });
    P.$('#learn-say').addEventListener('click', () => { if (learnCurrent) sayOne(PARTS[learnCurrent].fr); });

    P.$('#song-play').addEventListener('click', () => { if (singing) stopSong(); else playSong(); });
    P.$('#song-speed').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rate]');
      if (!b) return;
      songRate = Number(b.dataset.rate);
      P.$$('#song-speed .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      if (singing) playSong();
    });

    P.$('#touch-say').addEventListener('click', () => sayOne(PARTS[tr.order[tr.i]].touch));
    P.$('#touch-hint').addEventListener('click', () => {
      P.$('#touch-es').textContent = `Pista: es ${PARTS[tr.order[tr.i]].es}`;
    });
    P.$('#touch-next').addEventListener('click', touchNext);

    P.$('#name-answers').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) nameAnswer(b); });
    P.$('#name-say').addEventListener('click', () => sayList(nr.options.map((k) => PARTS[k].fr)));
    P.$('#name-next').addEventListener('click', nameNext);

    P.$('#res-again').addEventListener('click', P.replay);
    P.$('#res-menu').addEventListener('click', () => P.show('s-menu'));
    P.$('#btn-back').addEventListener('click', () => P.show('s-menu'));
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

    // Al cambiar de pantalla se calla la voz y se para la canción
    P.onShow((screen) => { if (singing) stopSong(); else hush(); refreshTopbar(screen); });
    document.addEventListener('pointerdown', () => { P.prefs.resumeOnGesture(); preload(); }, { once: true });
  }

  bind();
  P.$('#menu-hello').textContent = `Bonjour, ${P.profiles.current().name} !`;
  P.show('s-menu');
})(window.Peques);
