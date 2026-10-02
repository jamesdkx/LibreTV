#!/usr/bin/env python3
"""
Synthesize a short, quiet, upbeat plucked-instrument background bed.

Why this exists: this sandbox's egress proxy blocks the hosts that would
otherwise supply real royalty-free music (a HeyGen-authenticated BGM
catalog, generic stock-audio CDNs, etc.), so a fully offline, self-made
bed is the reliable fallback. It sounds like a simple kalimba/marimba
arpeggio in a major pentatonic scale -- pleasant under a voiceover without
competing for attention, and fully reusable across different product
videos (no need to regenerate per-video unless the user wants a different
feel).

Usage:
    python3 gen_bgm.py --out bgm.mp3 --duration 11 --bpm 128

Requires: numpy (pure-python WAV writer, no scipy). Converts to mp3 via
ffmpeg if available; otherwise leaves a .wav next to the requested path.
"""

import argparse
import os
import shutil
import subprocess
import sys
import wave

import numpy as np

NOTES = {
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.00, "A4": 440.00,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99,
}

# One bar = 16 eighth notes, bouncy up-and-down pentatonic run.
PATTERN = ["C4", "E4", "G4", "E4", "A4", "G4", "E4", "D4",
           "C4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"]


def pluck(freq: float, dur: float, sr: int) -> np.ndarray:
    n = int(dur * sr)
    t = np.arange(n) / sr
    wave_ = (
        1.0 * np.sin(2 * np.pi * freq * t)
        + 0.25 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.08 * np.sin(2 * np.pi * freq * 3 * t)
    )
    attack = int(0.004 * sr)
    env = np.ones(n)
    if attack > 0:
        env[:attack] = np.linspace(0, 1, attack)
    env *= np.exp(-5.5 * t)  # exponential decay -> plucky, not sustained
    return wave_ * env


def synth(duration: float, bpm: float, sr: int = 44100) -> np.ndarray:
    eighth = 60.0 / bpm / 2.0
    note_len = eighth * 1.9  # slight overlap for a legato pluck feel
    total_samples = int(duration * sr)
    buf = np.zeros(total_samples)

    t_cursor, i = 0.0, 0
    while t_cursor < duration:
        freq = NOTES[PATTERN[i % len(PATTERN)]]
        note = pluck(freq, min(note_len, duration - t_cursor), sr)
        start = int(t_cursor * sr)
        end = min(start + len(note), total_samples)
        buf[start:end] += note[: end - start]
        t_cursor += eighth
        i += 1

    # gentle stereo width: slight delay + attenuation on the right channel
    right = np.zeros(total_samples)
    delay = int(0.006 * sr)
    right[delay:] = buf[: total_samples - delay] * 0.92

    peak = max(np.max(np.abs(buf)), np.max(np.abs(right)), 1e-9)
    buf = buf / peak * 0.55
    right = right / peak * 0.55

    fade_n = int(0.3 * sr)
    fade_in, fade_out = np.linspace(0, 1, fade_n), np.linspace(1, 0, fade_n)
    for ch in (buf, right):
        ch[:fade_n] *= fade_in
        ch[-fade_n:] *= fade_out

    stereo = np.empty((total_samples, 2), dtype=np.float32)
    stereo[:, 0], stereo[:, 1] = buf, right
    return stereo


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="bgm.mp3", help="output path (.mp3 or .wav)")
    ap.add_argument("--duration", type=float, default=11.0, help="seconds (make it >= video length)")
    ap.add_argument("--bpm", type=float, default=128.0)
    args = ap.parse_args()

    stereo = synth(args.duration, args.bpm)
    pcm16 = (np.clip(stereo, -1.0, 1.0) * 32767).astype(np.int16)

    wav_path = args.out if args.out.endswith(".wav") else args.out + ".tmp.wav"
    with wave.open(wav_path, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(44100)
        f.writeframes(pcm16.tobytes())

    if args.out.endswith(".wav"):
        print(f"wrote {args.out} ({args.duration:.1f}s)")
        return

    if shutil.which("ffmpeg") is None:
        print(f"ffmpeg not found; leaving raw WAV at {wav_path}", file=sys.stderr)
        return

    subprocess.run(["ffmpeg", "-y", "-i", wav_path, args.out], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(wav_path)
    print(f"wrote {args.out} ({args.duration:.1f}s)")


if __name__ == "__main__":
    main()
