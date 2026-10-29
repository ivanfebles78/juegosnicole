/* Juego 1: ¿Dónde está? Posiciones relativas (izquierda, derecha, encima, debajo) con dos modos que se alternan:
   "elegir" la palabra que falta y "colocar" el objeto en su sitio. */
(function (P) {
  'use strict';

  const ROUND = 8;
  const REFS = [
    { e: '🌴', n: 'palmera', f: true }, { e: '🏠', n: 'casa', f: true }, { e: '🌳', n: 'árbol', f: false },
    { e: '🚗', n: 'coche', f: false }, { e: '📦', n: 'caja', f: true }, { e: '⛺', n: 'tienda de campaña', f: true },
    { e: '🪑', n: 'silla', f: true }, { e: '🚌', n: 'autobús', f: false }, { e: '🏰', n: 'castillo', f: false },
    { e: '🌵', n: 'cactus', f: false }, { e: '🛝', n: 'tobogán', f: false }, { e: '🍄', n: 'seta', f: true },
  ];
  const THINGS = [
    { e: '⚽', n: 'pelota', f: true }, { e: '🐱', n: 'gato', f: false }, { e: '🐶', n: 'perro', f: false },
    { e: '🐦', n: 'pájaro', f: false }, { e: '🧸', n: 'osito', f: false }, { e: '🍎', n: 'manzana', f: true },
    { e: '🐢', n: 'tortuga', f: true }, { e: '🦋', n: 'mariposa', f: true }, { e: '🎈', n: 'globo', f: false },
    { e: '🐰', n: 'conejo', f: false }, { e: '🌻', n: 'flor', f: true }, { e: '🐞', n: 'mariquita', f: true },
  ];
  const POS = { izquierda: 'a la izquierda', derecha: 'a la derecha', encima: 'encima', debajo: 'debajo' };
  const ORDER = ['izquierda', 'derecha', 'encima', 'debajo'];

  const the = (o) => (o.f ? 'la ' : 'el ') + o.n;
  const ofThe = (o) => (o.f ? 'de la ' : 'del ') + o.n;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  let round = null;

  function makeProblems() {
    const positions = P.shuffle([...ORDER, ...ORDER]);
    const refs = P.shuffle(REFS);
    const things = P.shuffle(THINGS);
    return positions.slice(0, ROUND).map((pos, i) => ({
      pos, ref: refs[i % refs.length], thing: things[i % things.length], mode: i % 2 === 0 ? 'elegir' : 'colocar',
    }));
  }

  function start() {
    round = { problems: makeProblems(), index: 0, results: [], answered: false };
    P.show('s-donde');
    render();
  }

  function sentence(p) {
    const sub = P.esc(cap(the(p.thing)));
    const ref = P.esc(ofThe(p.ref));
    if (p.mode === 'elegir') {
      return {
        html: `${sub} está <span class="gap" id="donde-gap">?</span> ${ref}.`,
        speak: `¿Dónde está ${the(p.thing)}? ${cap(the(p.thing))} está... ${ofThe(p.ref)}.`,
      };
    }
    return {
      html: `Pon ${P.esc(the(p.thing))} <em>${POS[p.pos]}</em> ${ref}.`,
      speak: `Pon ${the(p.thing)} ${POS[p.pos]} ${ofThe(p.ref)}.`,
    };
  }

  function render() {
    const p = round.problems[round.index];
    const scene = P.$('#donde-scene');
    const thing = P.$('#donde-thing');
    const text = sentence(p);
    P.$('#donde-q').innerHTML = text.html;
    P.$('#donde-ref').textContent = p.ref.e;
    thing.textContent = p.thing.e;
    thing.className = 'thing';
    scene.classList.toggle('place', p.mode === 'colocar');
    if (p.mode === 'elegir') {
      thing.hidden = false;
      thing.classList.add('pos-' + p.pos);
      P.animate(thing, 'drop');
    } else {
      thing.hidden = true;
    }
    const answers = P.$('#donde-answers');
    answers.hidden = p.mode !== 'elegir';
    answers.innerHTML = ORDER.map((k) => `<button class="answer" data-pos="${k}">${POS[k]}</button>`).join('');
    P.$('#donde-next').hidden = true;
    P.renderDots(P.$('#donde-dots'), ROUND, round.results, round.index);
    round.answered = false;
    P.voice.say(text.speak);
  }

  function finishAnswer(isCorrect, p) {
    round.answered = true;
    round.results = [...round.results, isCorrect];
    P.renderDots(P.$('#donde-dots'), ROUND, round.results, round.index);
    const next = P.$('#donde-next');
    next.hidden = false;
    next.textContent = round.index + 1 >= ROUND ? 'Ver resultado 🏆' : 'Siguiente ➜';
    const solution = `${cap(the(p.thing))} está ${POS[p.pos]} ${ofThe(p.ref)}.`;
    if (isCorrect) {
      P.celebrate(1);
      setTimeout(() => P.voice.say(solution), 700);
    } else {
      P.lament();
      setTimeout(() => P.voice.say('Mira bien. ' + solution), 1500);
    }
  }

  function onAnswer(ev) {
    const btn = ev.target.closest('.answer');
    if (!btn || round.answered) return;
    const p = round.problems[round.index];
    const isCorrect = btn.dataset.pos === p.pos;
    P.$$('#donde-answers .answer').forEach((b) => {
      b.disabled = true;
      if (b.dataset.pos === p.pos) b.classList.add('ok');
    });
    if (!isCorrect) btn.classList.add('ko');
    const gap = P.$('#donde-gap');
    gap.textContent = POS[p.pos];
    P.animate(gap, 'pop');
    finishAnswer(isCorrect, p);
  }

  function onSlot(ev) {
    const slot = ev.target.closest('.slot');
    if (!slot || round.answered) return;
    const p = round.problems[round.index];
    const thing = P.$('#donde-thing');
    const isCorrect = slot.dataset.pos === p.pos;
    P.$('#donde-scene').classList.remove('place');
    thing.hidden = false;
    thing.className = 'thing pos-' + slot.dataset.pos;
    P.animate(thing, 'drop');
    P.sound.pop();
    if (!isCorrect) {
      // Tras la pena, el objeto vuela a su sitio correcto para que lo vea
      setTimeout(() => { thing.className = 'thing pos-' + p.pos; }, 1300);
    }
    finishAnswer(isCorrect, p);
  }

  function next() {
    if (round.index + 1 >= ROUND) {
      P.showResult({ game: 'donde', score: round.results.filter(Boolean).length, total: ROUND, again: start });
      return;
    }
    round = { ...round, index: round.index + 1 };
    render();
  }

  function bind() {
    P.$('#donde-answers').addEventListener('click', onAnswer);
    P.$('#donde-scene').addEventListener('click', onSlot);
    P.$('#donde-next').addEventListener('click', next);
    P.$('#donde-say').addEventListener('click', () => P.voice.say(sentence(round.problems[round.index]).speak, { force: true }));
    P.$('#donde-hint').addEventListener('click', () => {
      const hands = P.$('#donde-hands');
      hands.hidden = !hands.hidden;
      if (!hands.hidden) P.voice.say('Mira las manos: la izquierda está en el lado azul y la derecha en el lado rojo.', { force: true });
    });
  }

  P.games = { ...(P.games || {}), donde: { start, bind } };
})(window.Peques);
