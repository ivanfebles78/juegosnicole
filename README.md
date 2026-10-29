# Juegos de Nicole

Juegos educativos para Nicole, publicados con GitHub Pages. La portada es la **Isla de Juegos**: allí se elige el jugador (nombre, avatar y color) **una sola vez**, y todos los juegos lo usan.

| Juego | Carpeta | Qué practica |
|---|---|---|
| ¿Dónde está? | `index.html` + `js/juego-donde.js` | Derecha, izquierda, encima y debajo |
| Mates mágicas | `index.html` + `js/juego-mates.js` | Sumas llevando y multiplicaciones |
| Mapa de España | `index.html` + `js/juego-mapa.js` | Comunidades autónomas |
| Leo y Comprendo | `lectura/` | Comprensión lectora (frases → cuentos) |
| Mi cuerpo en francés | `frances/` | Partes del cuerpo con «Tête, épaules, genoux et pieds» |

## Cómo comparten el jugador

Todos los juegos viven en el mismo dominio, así que comparten el `localStorage` del navegador:

- `peques.jugadores` y `peques.actual`: lista de jugadores y jugador elegido (los escribe la Isla).
- Leo y Comprendo lee ese jugador; si no hay ninguno, vuelve a la portada. Sus estrellas se suman a la ficha del jugador y su récord aparece en la isla. Su progreso se guarda por jugador en `leo-y-comprendo.v1.<id>`.

Mi cuerpo en francés no usa la voz del aparato (suele ser española): reproduce audios grabados con una voz francesa nativa en `frances/audio/`. Si cambias o añades frases, regénéralos con `python scripts/generar-audio-frances.py` (necesita `pip install edge-tts`).

Mi cuerpo en francés carga directamente `../js/core.js`, `sonido.js` y `perfiles.js`, así que comparte también los sonidos, las estrellas y la pantalla de resultado.

El progreso queda en cada dispositivo: no se sincroniza entre la tablet y el móvil.

## Añadir un juego nuevo

1. Ponlo en su propia carpeta (por ejemplo `frances/index.html`).
2. Añade su isla en `index.html`, dentro de `.islands`, como un enlace `<a class="island ..." href="frances/">`.
3. Para usar el mismo jugador, lee `peques.actual` y `peques.jugadores` del `localStorage`.

## Actualizar Leo y Comprendo

El original está en `../comprension-lectora/index.html` (es también la versión publicada en Claude). Después de cambiarlo, regenera la copia de esta carpeta:

```bash
sh scripts/build-lectura.sh
```

## Probar en local

```bash
python -m http.server 4195
```

Y abre http://localhost:4195.
