/* Juego 3: Mapa de España. Modo "jugar": elige un nombre de la lista y toca su comunidad en el mapa.
   Modo "explorar": toca cualquier comunidad para ver su nombre y su capital. */
(function (P) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const REGIONS = {
    '01': { name: 'Andalucía', label: 'Andalucía', capital: 'Sevilla', color: '#ffb84d' },
    '02': { name: 'Aragón', label: 'Aragón', capital: 'Zaragoza', color: '#ff7a6b' },
    '03': { name: 'Asturias', label: 'Asturias', capital: 'Oviedo', color: '#5cc8ff' },
    '04': { name: 'Islas Baleares', label: 'Baleares', capital: 'Palma', color: '#ff8cc6' },
    '05': { name: 'Canarias', label: 'Canarias', capital: 'Santa Cruz de Tenerife y Las Palmas de Gran Canaria', color: '#ffd84d' },
    '06': { name: 'Cantabria', label: 'Cantabria', capital: 'Santander', color: '#a98bff' },
    '07': { name: 'Castilla y León', label: 'Castilla y León', capital: 'Valladolid', color: '#7fd26b' },
    '08': { name: 'Castilla-La Mancha', label: 'Castilla-La Mancha', capital: 'Toledo', color: '#ffe066' },
    '09': { name: 'Cataluña', label: 'Cataluña', capital: 'Barcelona', color: '#ffa94d' },
    '10': { name: 'Comunidad Valenciana', label: 'C. Valenciana', capital: 'Valencia', color: '#4dd4c4' },
    '11': { name: 'Extremadura', label: 'Extremadura', capital: 'Mérida', color: '#b4e36b' },
    '12': { name: 'Galicia', label: 'Galicia', capital: 'Santiago de Compostela', color: '#6fa8ff' },
    '13': { name: 'Comunidad de Madrid', label: 'Madrid', capital: 'Madrid', color: '#ff5d7a' },
    '14': { name: 'Región de Murcia', label: 'Murcia', capital: 'Murcia', color: '#c78bff' },
    '15': { name: 'Navarra', label: 'Navarra', capital: 'Pamplona', color: '#ff9f80' },
    '16': { name: 'País Vasco', label: 'P. Vasco', capital: 'Vitoria-Gasteiz', color: '#3fbf7f' },
    '17': { name: 'La Rioja', label: 'La Rioja', capital: 'Logroño', color: '#e05ad6' },
  };
  const CITIES = { '18': 'Ceuta', '19': 'Melilla' };
  // Islas pequeñas: un círculo invisible amplía la zona que se puede tocar
  const HIT_RADIUS = { '04': 42, '05': 70 };

  let mode = 'jugar';
  let game = null; // { selected, done:Set, tries:{id:n}, firstTry:number }

  const sortedIds = () => Object.keys(REGIONS).sort((a, b) => REGIONS[a].name.localeCompare(REGIONS[b].name, 'es'));

  function el(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function buildMap() {
    const data = P.MAPA_DATA;
    const svg = P.$('#mapa-svg');
    svg.setAttribute('viewBox', `0 0 ${data.W} ${data.H}`);
    svg.innerHTML = '';
    svg.appendChild(el('path', { d: data.border, class: 'canary-border' }));
    const regions = el('g', {});
    const hits = el('g', {});
    data.regions.forEach((r) => {
      const isCity = Boolean(CITIES[r.id]);
      if (!isCity && !REGIONS[r.id]) return;
      const path = el('path', { d: r.d, class: isCity ? 'region city' : 'region', 'data-id': r.id });
      if (!isCity) path.appendChild(el('title', {})).textContent = mode === 'explorar' ? REGIONS[r.id].name : '';
      regions.appendChild(path);
      if (HIT_RADIUS[r.id]) hits.appendChild(el('circle', { cx: r.cx, cy: r.cy, r: HIT_RADIUS[r.id], class: 'hit', 'data-id': r.id }));
    });
    svg.appendChild(regions);
    svg.appendChild(hits);
    svg.appendChild(el('g', { id: 'mapa-labels' }));
    // Recorta el mar sobrante para que el mapa se vea lo más grande posible
    try {
      const b = regions.getBBox();
      if (b.width) svg.setAttribute('viewBox', `${b.x - 12} ${b.y - 12} ${b.width + 24} ${b.height + 24}`);
    } catch { /* sin medidas (pantalla oculta): se queda el encuadre completo */ }
  }

  const regionPath = (id) => P.$(`#mapa-svg .region[data-id="${id}"]`);
  const centroid = (id) => P.MAPA_DATA.regions.find((r) => r.id === id);

  function paint(id) {
    const path = regionPath(id);
    path.style.fill = REGIONS[id].color;
    path.classList.add('done');
    path.classList.remove('hint');
    const c = centroid(id);
    const text = el('text', { x: c.cx, y: c.cy + 5, class: 'map-label' });
    text.textContent = REGIONS[id].label;
    P.$('#mapa-labels').appendChild(text);
  }

  // ---------- Modo jugar ----------
  function startGame() {
    game = { selected: null, done: new Set(), tries: {}, firstTry: 0 };
    buildMap();
    renderNames();
    prompt();
  }

  function renderNames() {
    const box = P.$('#mapa-names');
    if (mode === 'explorar') {
      box.innerHTML = '<p class="fact" id="mapa-fact">Toca una comunidad del mapa para saber cómo se llama 👆</p>';
      P.$('#mapa-count').textContent = '17 comunidades autónomas';
      return;
    }
    box.innerHTML = sortedIds().map((id) => {
      const placed = game.done.has(id);
      return `<button class="name ${placed ? 'placed' : ''}" data-id="${id}" aria-pressed="${game.selected === id}" ${placed ? 'disabled' : ''}>${REGIONS[id].name}</button>`;
    }).join('');
    P.$('#mapa-count').textContent = `Colocadas: ${game.done.size} de 17`;
  }

  function prompt() {
    const q = P.$('#mapa-q');
    if (mode === 'explorar') { q.textContent = 'Explora el mapa: toca cada comunidad'; return; }
    q.innerHTML = game.selected
      ? `¿Dónde está <em>${REGIONS[game.selected].name}</em>? Tócala en el mapa`
      : 'Elige un nombre de la lista y toca su sitio en el mapa';
  }

  function selectName(id) {
    game = { ...game, selected: id };
    P.$$('#mapa-svg .region.hint').forEach((p) => p.classList.remove('hint'));
    if ((game.tries[id] || 0) >= 2) regionPath(id).classList.add('hint');
    renderNames();
    prompt();
    P.sound.tap();
    P.voice.say(`¿Dónde está ${REGIONS[id].name}?`);
  }

  function tapRegionPlaying(id) {
    if (game.done.has(id)) return;
    if (!game.selected) {
      P.voice.say('Primero elige un nombre de la lista.', { force: true });
      P.animate(P.$('#mapa-names'), 'shake');
      return;
    }
    const target = game.selected;
    if (id === target) {
      const first = !game.tries[target];
      const done = new Set(game.done);
      done.add(target);
      game = { ...game, done, selected: null, firstTry: game.firstTry + (first ? 1 : 0) };
      paint(target);
      P.celebrate(first ? 1 : 0);
      P.voice.say(`¡Sí! Esto es ${REGIONS[target].name}.`);
      renderNames();
      prompt();
      if (game.done.size === Object.keys(REGIONS).length) {
        setTimeout(() => P.showResult({ game: 'mapa', score: game.firstTry, total: game.done.size, again: startGame }), 1600);
      }
      return;
    }
    const tries = (game.tries[target] || 0) + 1;
    game = { ...game, tries: { ...game.tries, [target]: tries } };
    const wrong = regionPath(id);
    P.animate(wrong, 'wrong');
    P.lament();
    const msg = REGIONS[id] ? `Esa es ${REGIONS[id].name}. ` : '';
    setTimeout(() => P.voice.say(msg + (tries >= 2 ? 'Mira la que parpadea.' : '¡Prueba otra vez!')), 1400);
    if (tries >= 2) regionPath(target).classList.add('hint');
  }

  // ---------- Modo explorar ----------
  function startExplore() {
    game = null;
    buildMap();
    Object.keys(REGIONS).forEach(paint);
    renderNames();
    prompt();
  }

  function tapRegionExploring(id) {
    const r = REGIONS[id];
    if (!r) return;
    const plural = id === '05';
    P.$('#mapa-fact').innerHTML = `<b>${r.name}</b>${plural ? 'Capitales' : 'Capital'}: ${r.capital}`;
    P.animate(P.$('#mapa-fact'), 'pop');
    P.sound.pop();
    P.voice.say(`Esto es ${r.name}. ${plural ? 'Sus capitales son' : 'Su capital es'} ${r.capital}.`);
  }

  function setMode(next) {
    mode = next;
    P.$$('#mapa-mode .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.mode === next)));
    if (next === 'jugar') startGame(); else startExplore();
  }

  function bind() {
    P.$('#mapa-svg').addEventListener('click', (e) => {
      const target = e.target.closest('[data-id]');
      if (!target || CITIES[target.dataset.id]) return;
      if (mode === 'jugar') tapRegionPlaying(target.dataset.id); else tapRegionExploring(target.dataset.id);
    });
    P.$('#mapa-names').addEventListener('click', (e) => {
      const btn = e.target.closest('.name');
      if (btn && !btn.disabled) selectName(btn.dataset.id);
    });
    P.$('#mapa-mode').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) setMode(chip.dataset.mode);
    });
  }

  function start() {
    P.show('s-mapa');
    setMode('jugar');
  }

  P.games = { ...(P.games || {}), mapa: { start, bind } };
})(window.Peques);
