/* Sonido sintetizado con Web Audio (sin ficheros): efectos, música de fondo y voz que lee los enunciados. */
(function (P) {
  'use strict';

  const SETTINGS_KEY = 'peques.ajustes';
  const settings = { music: false, voice: true, ...P.store.get(SETTINGS_KEY, {}) };
  const saveSettings = () => P.store.set(SETTINGS_KEY, settings);

  let ctx = null;
  let master = null;
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = .9;
    master.connect(ctx.destination);
    return ctx;
  }

  /**
   * Toca una nota.
   * @param {{freq:number, start?:number, dur:number, type?:OscillatorType, vol?:number, slideTo?:number, vibrato?:number, filter?:number}} n
   */
  function note(n) {
    const c = audio();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime + (n.start || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type || 'triangle';
    osc.frequency.setValueAtTime(n.freq, t);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t + n.dur);
    let out = osc;
    if (n.filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = n.filter;
      osc.connect(f);
      out = f;
    }
    if (n.vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = n.vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t); lfo.stop(t + n.dur);
    }
    const vol = n.vol ?? .18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + .02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
    out.connect(gain).connect(master);
    osc.start(t); osc.stop(t + n.dur + .05);
  }

  const seq = (notes, opts = {}) => notes.forEach(([freq, start, dur]) => note({ freq, start, dur, ...opts }));

  const sound = {
    tap: () => note({ freq: 880, dur: .08, type: 'sine', vol: .12 }),
    pop: () => note({ freq: 500, slideTo: 1200, dur: .12, type: 'sine', vol: .14 }),
    // Arpegio alegre ascendente
    ok: () => seq([[523, 0, .14], [659, .1, .14], [784, .2, .14], [1047, .3, .35]], { type: 'square', vol: .08 }),
    // "Wah wah wah waaah" de trombón triste
    ko: () => {
      const o = { type: 'sawtooth', vol: .16, filter: 900 };
      note({ ...o, freq: 392, slideTo: 380, start: 0, dur: .32 });
      note({ ...o, freq: 370, slideTo: 358, start: .36, dur: .32 });
      note({ ...o, freq: 349, slideTo: 338, start: .72, dur: .32 });
      note({ ...o, freq: 330, slideTo: 300, start: 1.08, dur: 1.0, vibrato: 9 });
    },
    // Fanfarria de victoria
    win: () => {
      seq([[523, 0, .15], [523, .16, .15], [523, .32, .15], [659, .48, .5], [587, .9, .15], [659, 1.06, .15], [784, 1.22, .8]],
        { type: 'square', vol: .08 });
      seq([[262, 0, .45], [330, .48, .45], [392, .9, .9]], { type: 'triangle', vol: .12 });
    },
  };

  // ---------- Música de fondo: melodía en bucle tipo "caja de música" ----------
  const BEAT = .22;
  const MELODY = [ // [nota MIDI o null, duración en pulsos]
    [72, 1], [76, 1], [79, 1], [76, 1], [77, 1], [81, 1], [79, 2],
    [76, 1], [79, 1], [84, 1], [79, 1], [77, 1], [76, 1], [74, 2],
    [72, 1], [76, 1], [79, 1], [81, 1], [79, 1], [77, 1], [76, 1], [74, 1],
    [72, 1], [74, 1], [76, 1], [77, 1], [76, 1], [74, 1], [72, 2],
  ];
  const BASS = [48, 53, 55, 48];
  const midi = (m) => 440 * 2 ** ((m - 69) / 12);
  let musicTimer = null;
  let loopStart = 0;
  const loopBeats = MELODY.reduce((s, [, d]) => s + d, 0);

  function scheduleLoop() {
    const c = audio();
    if (!c) return;
    const base = loopStart - c.currentTime;
    let beat = 0;
    MELODY.forEach(([m, d]) => {
      if (m) note({ freq: midi(m), start: base + beat * BEAT, dur: d * BEAT * .9, type: 'sine', vol: .05 });
      beat += d;
    });
    for (let i = 0; i < loopBeats / 8; i++) {
      note({ freq: midi(BASS[i % BASS.length]), start: base + i * 8 * BEAT, dur: 8 * BEAT * .95, type: 'triangle', vol: .04 });
    }
    loopStart += loopBeats * BEAT;
  }

  function startMusic() {
    const c = audio();
    if (!c || musicTimer) return;
    if (c.state === 'suspended') c.resume();
    loopStart = c.currentTime + .1;
    scheduleLoop();
    // Programa la siguiente vuelta un poco antes de que acabe la actual
    musicTimer = setInterval(() => { if (loopStart - c.currentTime < 1.5) scheduleLoop(); }, 400);
  }
  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
    if (ctx) { // Cortar lo ya programado recreando la salida
      master.disconnect();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
  }

  // ---------- Voz ----------
  let esVoice = null;
  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    esVoice = voices.find((v) => v.lang === 'es-ES') || voices.find((v) => v.lang.startsWith('es')) || null;
  }
  if ('speechSynthesis' in window) {
    findVoice();
    speechSynthesis.addEventListener?.('voiceschanged', findVoice);
  }

  const voice = {
    say(text, { force = false } = {}) {
      if ((!settings.voice && !force) || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/_+/g, '…'));
        u.lang = 'es-ES';
        if (esVoice) u.voice = esVoice;
        u.rate = .95;
        u.pitch = 1.15;
        speechSynthesis.speak(u);
      } catch (err) { console.warn('Voz no disponible', err); }
    },
  };

  const prefs = {
    music: () => settings.music,
    voice: () => settings.voice,
    setMusic(on) {
      settings.music = on;
      saveSettings();
      if (on) startMusic(); else stopMusic();
    },
    setVoice(on) {
      settings.voice = on;
      saveSettings();
      if (!on && 'speechSynthesis' in window) speechSynthesis.cancel();
    },
    /** El navegador solo deja sonar tras un toque: arranca la música guardada en el primer gesto. */
    resumeOnGesture() {
      if (settings.music) startMusic();
    },
  };

  Object.assign(P, { sound, voice, prefs });
})(window.Peques);
