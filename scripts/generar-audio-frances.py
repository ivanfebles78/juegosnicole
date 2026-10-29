"""Genera los audios en francés nativo de «Mi cuerpo en francés» (frances/audio/*.mp3).

Usa la voz neuronal fr-FR-EloiseNeural (niña francesa) de edge-tts, para que la pronunciación
no dependa de las voces instaladas en cada tablet o móvil.

    python scripts/generar-audio-frances.py

El nombre de cada archivo es el texto «simplificado» (sin acentos ni signos), igual que slug() en frances.js.
"""
import asyncio
import re
import sys
import unicodedata
from pathlib import Path

import edge_tts

VOICE = "fr-FR-EloiseNeural"
OUT = Path(__file__).resolve().parent.parent / "frances" / "audio"

WORDS = ["la tête", "les épaules", "les genoux", "les pieds", "les yeux", "les oreilles", "la bouche", "le nez"]
TOUCH = [
    "Touche ta tête !", "Touche tes épaules !", "Touche tes genoux !", "Touche tes pieds !",
    "Touche tes yeux !", "Touche tes oreilles !", "Touche ta bouche !", "Touche ton nez !",
]
# La canción cantada se genera aparte con scripts/cantar-frances.py


def slug(text: str) -> str:
    plain = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-")


async def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    phrases = list(dict.fromkeys(WORDS + TOUCH))
    for text in phrases:
        target = OUT / f"{slug(text)}.mp3"
        try:
            await edge_tts.Communicate(text, VOICE, rate="-10%").save(str(target))
        except Exception as err:  # noqa: BLE001 - informar y seguir con el resto
            print(f"ERROR {text!r}: {err}", file=sys.stderr)
            return 1
        print(f"{target.name}  ←  {text}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
