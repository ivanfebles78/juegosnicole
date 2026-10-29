"""Genera la voz CANTADA de «Tête, épaules, genoux et pieds» (frances/audio/cancion-<tempo>.mp3).

Cómo canta una voz que solo sabe hablar:
  1. Cada sílaba de frances/cancion.json se pide a la voz francesa fr-FR-EloiseNeural (edge-tts).
  2. Con Praat (parselmouth) se cambia su tono a la nota exacta, con un vibrato suave en las notas largas,
     y se alarga la vocal (no las consonantes) hasta la duración de la nota.
  3. Las sílabas se colocan en su pulso y se guarda una pista por cada tempo.

    pip install edge-tts praat-parselmouth soundfile numpy
    python scripts/cantar-frances.py

La pista empieza `lead` segundos antes del pulso 0 (para que las consonantes entren antes de la nota);
frances.js la arranca con ese adelanto.
"""
from __future__ import annotations

import asyncio
import json
import math
import sys
import tempfile
import unicodedata
import re
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import numpy as np
import parselmouth
import soundfile as sf
from parselmouth.praat import call

VOICE = "fr-FR-EloiseNeural"
ROOT = Path(__file__).resolve().parent.parent
SONG = ROOT / "frances" / "cancion.json"
OUT = ROOT / "frances" / "audio"
CACHE = Path(tempfile.gettempdir()) / "cantar-frances"
RATE = 24000
LEGATO = 0.94          # parte de la nota que suena (el resto, respiro)
VIBRATO_HZ = 5.5
VIBRATO_SEMITONES = 0.3
VIBRATO_DELAY = 0.28   # el vibrato solo aparece en notas largas


@dataclass(frozen=True)
class Note:
    syllable: str
    midi: int
    beat: float
    beats: float


def slug(text: str) -> str:
    plain = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-") or "x"


def midi_hz(midi: int) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


async def fetch_syllables(syllables: set[str]) -> dict[str, Path]:
    CACHE.mkdir(parents=True, exist_ok=True)
    paths = {}
    for syl in sorted(syllables):
        path = CACHE / f"{slug(syl)}.mp3"
        if not path.exists():
            await edge_tts.Communicate(syl, VOICE).save(str(path))
        paths[syl] = path
    return paths


def load_trimmed(path: Path) -> parselmouth.Sound:
    data, rate = sf.read(str(path), dtype="float64")
    if data.ndim > 1:
        data = data.mean(axis=1)
    level = np.abs(data)
    threshold = max(level.max() * 0.04, 1e-4)
    loud = np.nonzero(level > threshold)[0]
    pad = int(0.01 * rate)
    start, end = max(0, loud[0] - pad), min(len(data), loud[-1] + pad)
    return parselmouth.Sound(data[start:end], sampling_frequency=rate)


def voiced_span(snd: parselmouth.Sound) -> tuple[float, float]:
    pitch = snd.to_pitch(time_step=0.005, pitch_floor=120, pitch_ceiling=600)
    f0 = pitch.selected_array["frequency"]
    times = pitch.xs()
    voiced = times[f0 > 0]
    if voiced.size == 0:
        return 0.0, snd.duration
    return float(voiced[0]), float(voiced[-1])


def sing(snd: parselmouth.Sound, midi: int, target: float) -> tuple[np.ndarray, float]:
    """Afina la sílaba a la nota y la estira a `target` segundos. Devuelve (muestras, consonante inicial en s)."""
    length = snd.duration
    v0, v1 = voiced_span(snd)
    head, tail, vowel = v0, length - v1, max(v1 - v0, 0.02)
    manip = call(snd, "To Manipulation", 0.005, 120, 600)

    # Duración: se estira solo la parte con voz; si no cabe, se comprime todo por igual
    durations = call("Create DurationTier", "d", 0, length)
    if head + tail > target * 0.6:
        factor = target / length
        call(durations, "Add point", 0, factor)
        head *= factor
        stretch = factor
    else:
        stretch = (target - head - tail) / vowel
        for t, f in ((0, 1), (max(v0 - 0.002, 0), 1), (v0, stretch), (v1, stretch), (min(v1 + 0.002, length), 1), (length, 1)):
            call(durations, "Add point", t, f)
    call([manip, durations], "Replace duration tier")

    # Tono: la nota exacta y, en notas largas, un vibrato que va apareciendo
    pitches = call("Create PitchTier", "p", 0, length)
    base = midi_hz(midi)
    for t in np.arange(0, length + 0.005, 0.005):
        out_t = t if t < v0 else head + (min(t, v1) - v0) * stretch + max(t - v1, 0)
        depth = VIBRATO_SEMITONES * min(max((out_t - VIBRATO_DELAY) / 0.2, 0), 1)
        hz = base * 2 ** (depth * math.sin(2 * math.pi * VIBRATO_HZ * out_t) / 12)
        call(pitches, "Add point", float(t), hz)
    call([pitches, manip], "Replace pitch tier")

    sung = call(manip, "Get resynthesis (overlap-add)")
    samples = sung.values[0]
    if sung.sampling_frequency != RATE:
        samples = np.interp(np.linspace(0, len(samples) - 1, int(len(samples) * RATE / sung.sampling_frequency)),
                            np.arange(len(samples)), samples)
    fade = int(0.012 * RATE)
    envelope = np.ones(len(samples))
    envelope[:fade] = np.linspace(0, 1, fade)
    envelope[-fade:] = np.linspace(1, 0, fade)
    samples = samples * envelope
    rms = math.sqrt(float(np.mean(samples ** 2))) or 1
    return samples * (0.12 / rms), min(head, 0.09)


def render(notes: list[Note], sounds: dict[str, parselmouth.Sound], bpm: int, beats: float, lead: float) -> np.ndarray:
    beat = 60 / bpm
    track = np.zeros(int((lead + beats * beat + 0.6) * RATE))
    for note in notes:
        samples, onset = sing(sounds[note.syllable], note.midi, note.beats * beat * LEGATO)
        start = int((lead + note.beat * beat - onset) * RATE)
        end = min(start + len(samples), len(track))
        track[start:end] += samples[: end - start]
    peak = float(np.max(np.abs(track))) or 1
    return track * (0.89 / peak)


async def main() -> int:
    song = json.loads(SONG.read_text(encoding="utf-8"))
    notes = [Note(n["s"], n["m"], n["b"], n["d"]) for n in song["notes"]]
    try:
        paths = await fetch_syllables({n.syllable for n in notes})
    except Exception as err:  # noqa: BLE001 - sin conexión o servicio caído
        print(f"No se pudo generar la voz: {err}", file=sys.stderr)
        return 1
    sounds = {syl: load_trimmed(path) for syl, path in paths.items()}
    OUT.mkdir(parents=True, exist_ok=True)
    for bpm in song["tempos"]:
        track = render(notes, sounds, bpm, song["beats"], song["lead"])
        target = OUT / f"cancion-{bpm}.mp3"
        sf.write(str(target), track, RATE, format="MP3")
        print(f"{target.name}: {len(track) / RATE:.1f} s a {bpm} ppm")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
