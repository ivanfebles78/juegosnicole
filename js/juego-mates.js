/* Juego 2: Mates mágicas. Sumas en columna con llevadas (1 a 4 cifras) y multiplicaciones del 1 al 10
   explicadas como sumas repetidas. */
(function (P) {
  'use strict';

  const ROUND = 5;
  const MAX_MUL = 10;
  const FRUITS = ['🍎', '🍓', '⭐', '🍪', '🌸', '🎈', '🍭', '🐞'];

  let sumDigits = 2;
  let round = null;

  function startRound(kind, problems) {
    round = { kind, problems, index: 0, results: [], answered: false };
  }

  function registerAnswer(isCorrect, fb, solution) {
    round.answered = true;
    round.results = [...round.results, isCorrect];
    fb.className = 'feedback ' + (isCorrect ? 'ok' : 'ko');
    fb.innerHTML = isCorrect ? '¡Correcto! <small>+1 estrella ⭐</small>' : `¡Casi! <small>La respuesta era <b>${solution}</b></small>`;
    if (isCorrect) P.celebrate(1); else P.lament();
  }

  function nextOrFinish(renderFn) {
    if (round.index + 1 >= round.problems.length) {
      const again = round.kind === 'sumas' ? startSums : startMul;
      P.showResult({ game: 'mates', score: round.results.filter(Boolean).length, total: round.problems.length, again });
      return;
    }
    round = { ...round, index: round.index + 1, answered: false };
    renderFn();
  }

  // ---------- SUMAS ----------
  const hasCarry = (a, b) => {
    for (let x = a, y = b; x || y; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
      if ((x % 10) + (y % 10) >= 10) return true;
    }
    return false;
  };

  function makeSum(digits) {
    // Casi siempre con alguna llevada, que es lo que se practica
    for (let tries = 0; tries < 50; tries++) {
      const a = P.randInt(digits === 1 ? 1 : 10 ** (digits - 1), 10 ** digits - 1);
      const bDigits = digits === 1 ? 1 : P.randInt(digits - 1, digits);
      const b = P.randInt(bDigits === 1 ? 1 : 10 ** (bDigits - 1), 10 ** bDigits - 1);
      if (hasCarry(a, b) || tries > 40 || Math.random() < .15) return { a, b };
    }
    return { a: 9, b: 5 };
  }

  function startSums() {
    startRound('sumas', Array.from({ length: ROUND }, () => makeSum(sumDigits)));
    P.show('s-sum');
    renderSum();
  }

  function digitCells(num, width) {
    const s = String(num);
    return Array.from({ length: width }, (_, i) => {
      const idx = i - (width - s.length);
      return idx >= 0 ? s[idx] : '';
    });
  }

  function renderSum() {
    const { a, b } = round.problems[round.index];
    const width = sumDigits + 1;
    const board = P.$('#sum-board');
    board.style.setProperty('--cols', width + 1);
    const empty = '<div class="cell"></div>';
    const carryRow = [empty, ...Array.from({ length: width }, (_, i) => (i < width - 1
      ? `<div class="cell"><button type="button" class="carry" data-col="${i}" aria-label="Me llevo 1"></button></div>`
      : empty))];
    const rowA = [empty, ...digitCells(a, width).map((d) => `<div class="cell">${d}</div>`)];
    const rowB = ['<div class="cell sign">+</div>', ...digitCells(b, width).map((d) => `<div class="cell">${d}</div>`)];
    const ansRow = [empty, ...Array.from({ length: width }, (_, i) =>
      `<input class="ans" data-col="${i}" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Cifra ${width - i} del resultado">`)];
    board.innerHTML = [...carryRow, ...rowA, ...rowB, '<div class="sum-line"></div>', ...ansRow].join('');

    P.$('#sum-title').textContent = `Suma ${round.index + 1} de ${round.problems.length}`;
    P.$('#sum-feedback').className = 'feedback';
    P.$('#sum-feedback').innerHTML = '';
    P.$('#sum-check').hidden = false;
    P.$('#sum-clear').hidden = false;
    P.$('#sum-next').hidden = true;
    P.renderDots(P.$('#sum-dots'), round.problems.length, round.results, round.index);
    P.voice.say(`¿Cuánto es ${a} más ${b}?`);
    focusLastAnswer();
  }

  function focusLastAnswer() {
    const cells = P.$$('#sum-board .ans');
    if (cells.length) cells[cells.length - 1].focus();
  }

  const ansAt = (col) => P.$(`#sum-board .ans[data-col="${col}"]`);

  function onSumInput(ev) {
    const el = ev.target;
    if (!el.classList.contains('ans')) return;
    el.value = el.value.replace(/\D/g, '').slice(-1);
    el.classList.remove('ok', 'ko');
    if (el.value) ansAt(Number(el.dataset.col) - 1)?.focus();
  }

  function onSumKeydown(ev) {
    const el = ev.target;
    if (!el.classList.contains('ans')) return;
    const col = Number(el.dataset.col);
    if (ev.key === 'Enter') { ev.preventDefault(); round.answered ? P.$('#sum-next').click() : checkSum(); }
    else if (ev.key === 'Backspace' && !el.value) {
      const nextCell = ansAt(col + 1);
      if (nextCell) { ev.preventDefault(); nextCell.value = ''; nextCell.focus(); }
    }
    else if (ev.key === 'ArrowLeft') ansAt(col - 1)?.focus();
    else if (ev.key === 'ArrowRight') ansAt(col + 1)?.focus();
  }

  function onCarryClick(ev) {
    const btn = ev.target.closest('.carry');
    if (!btn || round.answered) return;
    const on = !btn.classList.contains('on');
    btn.classList.toggle('on', on);
    btn.textContent = on ? '1' : '';
    P.sound.tap();
  }

  function flash(fb, text) {
    fb.className = 'feedback ko';
    fb.textContent = text;
    P.animate(fb, 'shake');
  }

  function checkSum() {
    if (round.answered) return;
    const cells = P.$$('#sum-board .ans');
    const values = cells.map((c) => c.value);
    const first = values.findIndex((v) => v !== '');
    const fb = P.$('#sum-feedback');
    if (first === -1) { flash(fb, 'Escribe el resultado debajo de la raya ✏️'); focusLastAnswer(); return; }
    if (values.slice(first).some((v) => v === '')) { flash(fb, '¡Te falta alguna casilla por rellenar! 👀'); return; }
    const { a, b } = round.problems[round.index];
    const expected = a + b;
    const isCorrect = Number(values.slice(first).join('')) === expected;
    const expCells = digitCells(expected, cells.length);
    cells.forEach((c, i) => {
      c.readOnly = true;
      if (c.value || expCells[i]) c.classList.add(c.value === expCells[i] ? 'ok' : 'ko');
    });
    registerAnswer(isCorrect, fb, `${a} + ${b} = ${expected}`);
    P.$('#sum-check').hidden = true;
    P.$('#sum-clear').hidden = true;
    const next = P.$('#sum-next');
    next.hidden = false;
    next.textContent = round.index + 1 >= round.problems.length ? 'Ver resultado 🏆' : 'Siguiente ➜';
    P.renderDots(P.$('#sum-dots'), round.problems.length, round.results, round.index);
    next.focus();
  }

  function clearSum() {
    P.$$('#sum-board .ans').forEach((c) => { c.value = ''; c.classList.remove('ok', 'ko'); });
    P.$$('#sum-board .carry').forEach((c) => { c.classList.remove('on'); c.textContent = ''; });
    P.$('#sum-feedback').textContent = '';
    focusLastAnswer();
  }

  // ---------- MULTIPLICACIONES ----------
  function groupsHtml(a, b, item) {
    return Array.from({ length: b }, (_, g) =>
      `<div class="group" style="animation-delay:${g * .12}s">${Array.from({ length: a }, () => `<span class="it">${item}</span>`).join('')}</div>`).join('');
  }

  const times = (b) => `${b} ${b === 1 ? 'vez' : 'veces'}`;

  function renderExample(a, b) {
    P.$('#ex-a').textContent = a;
    P.$('#ex-b').textContent = b;
    P.$('#ex-explain').innerHTML = `Cogemos el <b>${a}</b> y lo sumamos <b>${times(b)}</b>:`;
    P.$('#ex-groups').innerHTML = groupsHtml(a, b, P.pick(FRUITS));
    const adds = Array.from({ length: b }, () => `<span class="n">${a}</span>`).join(' + ');
    P.$('#ex-sum').innerHTML = `${a} × ${b} = ${adds} = <span class="t">${a * b}</span>`;
    P.voice.say(`${a} por ${b} es sumar el ${a}, ${times(b)}. ${Array(b).fill(a).join(' más ')}, igual a ${a * b}.`);
  }

  function openMulIntro() {
    P.show('s-mul-intro');
    renderExample(3, 2);
  }

  function makeMulProblems() {
    const seen = new Set();
    const list = [];
    while (list.length < ROUND) {
      const a = P.randInt(1, MAX_MUL);
      const b = P.randInt(1, MAX_MUL);
      const key = a + 'x' + b;
      if (seen.has(key) || ((a === 1 || b === 1) && Math.random() < .7)) continue;
      seen.add(key);
      list.push({ a, b });
    }
    return list;
  }

  function startMul() {
    startRound('multi', makeMulProblems());
    P.show('s-mul');
    renderMul();
  }

  function renderMul() {
    const { a, b } = round.problems[round.index];
    P.$('#mul-a').textContent = a;
    P.$('#mul-b').textContent = b;
    const input = P.$('#mul-input');
    input.value = ''; input.readOnly = false; input.className = 'mul-input';
    P.$('#mul-title').textContent = `Multiplicación ${round.index + 1} de ${round.problems.length}`;
    P.$('#mul-feedback').className = 'feedback';
    P.$('#mul-feedback').innerHTML = '';
    P.$('#mul-hint').hidden = true;
    P.$('#mul-hint-btn').hidden = false;
    P.$('#mul-check').hidden = false;
    P.$('#mul-next').hidden = true;
    P.renderDots(P.$('#mul-dots'), round.problems.length, round.results, round.index);
    P.voice.say(`¿Cuánto es ${a} por ${b}?`);
    input.focus();
  }

  function showMulHint(reveal) {
    const { a, b } = round.problems[round.index];
    const adds = Array.from({ length: b }, () => `<span class="n">${a}</span>`).join(' + ');
    P.$('#hint-sum').innerHTML = `Suma el ${a}, ${times(b)}: ${adds} = <span class="t">${reveal ? a * b : '?'}</span>`;
    P.$('#hint-groups').innerHTML = groupsHtml(a, b, P.pick(FRUITS));
    P.$('#mul-hint').hidden = false;
    if (!reveal) P.voice.say(`Suma el ${a}, ${times(b)}.`, { force: true });
  }

  function checkMul() {
    if (round.answered) return;
    const input = P.$('#mul-input');
    const fb = P.$('#mul-feedback');
    const raw = input.value.trim();
    if (!/^\d{1,3}$/.test(raw)) { flash(fb, 'Escribe un número ✏️'); input.focus(); return; }
    const { a, b } = round.problems[round.index];
    const isCorrect = Number(raw) === a * b;
    input.readOnly = true;
    input.classList.add(isCorrect ? 'ok' : 'ko');
    registerAnswer(isCorrect, fb, `${a} × ${b} = ${a * b}`);
    if (!isCorrect) showMulHint(true);
    P.$('#mul-hint-btn').hidden = true;
    P.$('#mul-check').hidden = true;
    const next = P.$('#mul-next');
    next.hidden = false;
    next.textContent = round.index + 1 >= round.problems.length ? 'Ver resultado 🏆' : 'Siguiente ➜';
    P.renderDots(P.$('#mul-dots'), round.problems.length, round.results, round.index);
    next.focus();
  }

  function bind() {
    P.$('#digit-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      sumDigits = Number(chip.dataset.d);
      P.$$('#digit-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      P.sound.tap();
    });
    P.$('#go-sum').addEventListener('click', startSums);
    P.$('#go-mul').addEventListener('click', openMulIntro);

    const board = P.$('#sum-board');
    board.addEventListener('input', onSumInput);
    board.addEventListener('keydown', onSumKeydown);
    board.addEventListener('click', onCarryClick);
    P.$('#sum-check').addEventListener('click', checkSum);
    P.$('#sum-clear').addEventListener('click', clearSum);
    P.$('#sum-next').addEventListener('click', () => nextOrFinish(renderSum));

    P.$('#ex-other').addEventListener('click', () => renderExample(P.randInt(2, 5), P.randInt(2, 4)));
    P.$('#ex-go').addEventListener('click', startMul);
    P.$('#mul-input').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); });
    P.$('#mul-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); round.answered ? P.$('#mul-next').click() : checkMul(); }
    });
    P.$('#mul-hint-btn').addEventListener('click', () => showMulHint(false));
    P.$('#mul-check').addEventListener('click', checkMul);
    P.$('#mul-next').addEventListener('click', () => nextOrFinish(renderMul));
  }

  const start = () => P.show('s-mates');

  P.games = { ...(P.games || {}), mates: { start, bind } };
})(window.Peques);
