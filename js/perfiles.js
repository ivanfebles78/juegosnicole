/* Jugadores: nombre, avatar, color favorito, estrellas y mejor marca de cada juego (guardado en este dispositivo). */
(function (P) {
  'use strict';

  const KEYS = { list: 'peques.jugadores', current: 'peques.actual' };
  const AVATARS = ['🐶', '🐱', '🦄', '🐵', '🐼', '🦁', '🐸', '🐧', '🐰', '🦖', '🐙', '🦊', '🐯', '🐨', '🦸‍♀️', '🦸‍♂️', '🧚‍♀️', '🧜‍♀️', '🤖', '👽', '🐝', '🐬', '🦉', '🐞'];
  const COLORS = ['#ff5d4f', '#ffc93c', '#27b36f', '#2f8cff', '#8b5cf6', '#ff8cc6', '#ff9a3c', '#1fc7c7'];

  let players = P.store.get(KEYS.list, []);
  let currentId = P.store.get(KEYS.current, null);

  const persist = () => P.store.set(KEYS.list, players);
  const current = () => players.find((p) => p.id === currentId) || null;

  function update(id, changes) {
    players = players.map((p) => (p.id === id ? { ...p, ...changes } : p));
    persist();
  }

  /** Crea un jugador. Devuelve el mensaje de error o '' si todo va bien. */
  function create({ name, avatar, color }) {
    const clean = name.trim();
    if (!clean) return 'Escribe tu nombre ✏️';
    if (!avatar) return 'Elige un avatar 🐾';
    if (players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return 'Ese nombre ya existe: tócalo arriba 👆';
    const player = { id: 'j' + Date.now() + P.randInt(100, 999), name: clean, avatar, color: color || COLORS[0], stars: 0, best: {} };
    players = [...players, player];
    persist();
    select(player.id);
    return '';
  }

  function select(id) {
    currentId = id;
    P.store.set(KEYS.current, id);
  }

  function addStars(n) {
    const p = current();
    if (!p) return;
    update(p.id, { stars: (p.stars || 0) + n });
    const pill = P.$('#me-stars');
    pill.textContent = `⭐ ${current().stars}`;
    P.animate(pill, 'bump');
  }

  /** Guarda la mejor marca (proporción de aciertos) de un juego. */
  function saveBest(game, score, total) {
    const p = current();
    if (!p || !total) return;
    const prev = (p.best || {})[game];
    if (prev && prev.score / prev.total >= score / total) return;
    update(p.id, { best: { ...(p.best || {}), [game]: { score, total } } });
  }

  P.profiles = { AVATARS, COLORS, all: () => players, current, create, select, addStars, saveBest };
})(window.Peques);
