#!/usr/bin/env sh
# Genera lectura/index.html a partir del original de Leo y Comprendo (../comprension-lectora/index.html).
# Añade la cabecera HTML completa y LEO_HUB, para que use el jugador elegido en la Isla de Juegos.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/../comprension-lectora/index.html}"
OUT="$ROOT/lectura/index.html"
LINE=$(grep -n '^<div id="app"></div>' "$SRC" | cut -d: -f1)
mkdir -p "$ROOT/lectura"
{
  cat <<'HEAD'
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
<script>window.LEO_HUB = '../';</script>
HEAD
  head -n $((LINE - 1)) "$SRC" | grep -v 'claude:viewport-fit-sides'
  echo '</head>'
  echo '<body>'
  tail -n +"$LINE" "$SRC"
  echo '</body>'
  echo '</html>'
} > "$OUT"
echo "Generado $OUT"
