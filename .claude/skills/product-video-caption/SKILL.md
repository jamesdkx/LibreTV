---
name: product-video-caption
description: >
  Turn a short vertical product-demo video (a person on camera holding/showing
  a product, roughly 10s, portrait-ish framing) plus a marketing script into a
  captioned, kinetic-typography short-form video with a background track from
  the user's HeyGen music library (synthesized offline fallback) — no
  speech-to-text model required. Use
  this whenever the user uploads a talking-product video (fruit, food,
  skincare, any physical product) together with a script/caption text and
  asks to "加字幕", "加特效字幕", "花字", 後製, add captions/subtitles, or
  otherwise dress up a short promotional clip — even if they never say
  "HyperFrames" or name this skill directly. Also use it when asked to make a
  hook/cover image for such a video, or to combine an existing cover with an
  existing captioned video. Do not auto-generate a cover as part of the
  default flow — always ask the user first; captions + music + render are the
  expected default deliverable.
---

# Product video captioning

This skill packages a full pipeline that was built and validated across four
real product videos in one working session (mango, Taiwanese pear, passion
fruit, Korean-labeled muscat grapes). Every rule below exists because
something broke a specific way during that process — read the "why" behind
each one before deviating from it.

## The core constraint that shapes everything

**This sandbox cannot reach speech-to-text models.** `huggingface.co`, the
OpenAI model CDN, and similar hosts are blocked by the egress proxy, so
WhisperX, whisper.cpp, and the embedded-captions skill's own ASR pipeline all
fail here. Do not spend time retrying them — the failure is a network policy,
not a transient error. Two consequences flow from this single fact, and they
shape steps 2 and 7 below:

- **Caption timing comes from silence detection, not a transcript.** `ffmpeg`'s
  `silencedetect` filter finds the pauses in the actual audio; the user's
  script (which you already have verbatim) gets segmented by meaning and
  matched onto those pauses. This has worked cleanly across all four test
  videos because natural speech pauses at clause boundaries anyway.
- **Music comes from the user's HeyGen library** (the user chose this). The
  user widened the cloud environment's network access to `*.heygen.com` /
  `*.heygen.ai`, so the `heygen` CLI can be installed and signed in (see
  Step 0) and the media-use skill can pull catalog tracks. Only if HeyGen is
  unreachable or sign-in fails, fall back to `scripts/gen_bgm.py`, which
  synthesizes a light plucked-arpeggio bed offline — and tell the user the
  fallback was used.

If a future session finds these hosts are no longer blocked, the ASR-driven
embedded-captions pipeline and a real BGM library become the better choice —
this skill is a deliberate workaround for a real network constraint, not a
belief that offline synthesis is superior.

## Step 0 — Set up the toolchain once per session

```bash
npm install gsap --no-save        # local copy for offline <script> refs
pip install numpy                 # for gen_bgm.py
```

The rendering browser here cannot reach `cdn.jsdelivr.net` or similar CDNs
(only npm/pypi-style registries are reachable), so every composition must
reference `./assets/gsap.min.js` copied from `node_modules/gsap/dist/`, never
a CDN URL — a CDN `<script src>` will make `hyperframes check`/`render` hang
or fail with a tunnel error partway through.

Also confirm `ffmpeg` is installed (`apt-get install -y ffmpeg` if not,
handling the `libva2`/`libcaca0` dependency chain — running `apt-get update`
first usually clears stale-index 404s on those).

Source footage in HEVC/H.265 must be transcoded to H.264 before use
(`ffmpeg -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac`) — the render
browser may not decode HEVC.

### HeyGen CLI + sign-in (for the music library)

```bash
export PATH="$HOME/.local/bin:$PATH"
heygen auth status            # already signed in? skip the rest
curl -fsSL https://static.heygen.ai/cli/install.sh -o heygen-install.sh && bash heygen-install.sh
```

Sign in with **OAuth** (subscription credits; an API key would bill API
credits instead). This is a remote container with no browser, and
`--device` login was rejected by HeyGen (`invalid_request`), so use this
proven workaround:

1. Start the login inside a pseudo-TTY whose stdin stays open (otherwise the
   loopback listener exits before the user finishes and auth "fails"):
   ```bash
   (sleep 1800 | HEYGEN_NO_BROWSER=1 BROWSER=none setsid script -qfc \
     "$HOME/.local/bin/heygen auth login --oauth" heygen-oauth.log >/dev/null 2>&1 &)
   sleep 6; grep -o 'https://app.heygen.com/oauth/authorize?[^ ]*' heygen-oauth.log
   ```
2. Give the user that link. After approving, their browser lands on an
   unreachable `http://127.0.0.1:<port>/oauth/callback?code=...` page
   ("無法連上這個網站") — that is expected; ask them to copy the whole
   address-bar URL and paste it back (the user is non-technical: give
   step-by-step instructions).
3. Replay it inside the container: `curl -sS "<pasted URL>"`, then confirm
   with `heygen auth status`.
4. Verify the toolchain: `node .claude/skills/media-use/scripts/resolve.mjs --doctor`.

The OAuth session auto-refreshes, but a container reset wipes both the CLI
and the credential — redo this section when `heygen auth status` fails.

## Step 1 — Decision gate on the uploaded footage

Before touching captions, look at the actual video:

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of default=noprint_wrappers=1 input.mp4
ffmpeg -y -ss <20%> -i input.mp4 -vframes 1 -update 1 t1.png
ffmpeg -y -ss <50%> -i input.mp4 -vframes 1 -update 1 t2.png
ffmpeg -y -ss <80%> -i input.mp4 -vframes 1 -update 1 t3.png
ffmpeg -y -i input.mp4 -vf "fps=1,scale=140:-1,tile=10x1" contact-sheet.png
```

Read these with the Read tool (not just probe metadata) and confirm: one
speaker, no hard cuts, no burned-in text already on the footage, face
actually visible. Note the resolution/fps/duration — the final render must
match them.

**Cross-check the product against the script.** If the packaging in frame
shows text that contradicts the script's claims (a country-of-origin label,
a different product name, a visible ingredient list that disagrees with what
the voiceover says), stop and ask the user rather than silently captioning a
claim the footage visibly contradicts. This happened once already (script
said "Korean muscat grape," the box printed "PRODUCT OF JAPAN" in Japanese) —
the user may have a real answer for it, but it's their call to make, not
something to paper over.

## Step 2 — Segment the script against detected pauses

```bash
ffmpeg -i input.mp4 -af "silencedetect=noise=-28dB:d=0.08" -f null - 2>&1 \
  | grep -E "silence_start|silence_end|silence_duration"
```

Start around `noise=-28dB:d=0.08` and loosen/tighten if the segment count
doesn't match the number of natural clauses in the script. The gaps between
`silence_end` and the next `silence_start` are speech segments — map the
user's script onto them in order, one clause per segment.

Sanity-check the mapping with a speech-rate estimate: natural Mandarin/
Taiwanese speech runs roughly 7-9 characters per second. If a segment implies
something wildly outside that range, first suspect the segmentation (two
short segments might actually be one clause with a mid-word breath, or a
long segment might cover two clauses spoken without a detectable gap — closing
lines in particular often get spoken slower/more deliberately for emphasis,
which is a legitimate reason for a low char/sec ratio, not necessarily a
segmentation bug).

Leave small padding: start each caption ~0.05-0.1s after the segment starts,
and end it a little before the segment's end so it doesn't visually collide
with the next caption's entrance.

## Step 3 — Scaffold the HyperFrames project

```bash
npx hyperframes init <project-dir> --non-interactive --video <input.mp4> --skill=embedded-captions
```

This is used purely for its scaffold (`hyperframes.json`, the base
`index.html`) — do not run `prepare.sh` or anything that invokes the ASR
pipeline; it will fail on the network block and waste time. Hand-author the
composition directly (see Step 4), the same way you'd build any HyperFrames
piece: one `<video>` for the untouched a-roll, styled `<div>` caption layers
timed with `data-start`/`data-duration`, one paused GSAP timeline.

**Font: use `"Noto Sans JP"` for all Chinese text**, full stop. It's the only
family in HyperFrames' auto-embedded list that reliably renders complete
Traditional Chinese — `"Noto Sans TC"` looked like the "correct" choice by
name but only fetched a Latin-only subset in testing here, silently turning
every Chinese glyph into a blank box. `"Noto Serif JP"` renders correctly and
tempting for a serif contrast, but it isn't in the auto-embedded list, so
declaring it trips `font_family_without_font_face` in `hyperframes lint` —
and `hyperframes check` skips its entire browser-based audit (layout,
contrast, snapshots) whenever lint reports an error, so that one font choice
silently disables all of Step 6's safety net. If a lighter/more editorial
feel is wanted, use Noto Sans JP at `font-weight: 400` with `font-style:
italic` — the browser synthesizes the slant, and weight contrast against the
900-weight lines elsewhere does the differentiation work instead.

## Step 4 — Design the caption treatments

Segment the clauses by role, not just by pause — each role gets a distinct
look, so the four-treatment system reads as designed rather than random:

| Role | Look | Why |
|---|---|---|
| Opening hook / closing CTA | Fill + stroke + glow (`-webkit-text-stroke` with `paint-order: stroke fill`, plus `text-shadow` glow), or a solid gradient-filled pill for the CTA | Needs the most visual weight — it's the line that has to stop a scroll or drive an action |
| Product name / short punch line (4-7 characters) | Gradient-fill text (`background: linear-gradient(...); -webkit-background-clip: text; color: transparent`) | Short enough to read as a hero moment without a stroke's clutter |
| Plain informational line | Standard bold white text in a dark semi-transparent pill, with one accent word in gold | This is most of the runtime — it should be the easiest one to read, not the flashiest |
| Sensory/emotional descriptor | Noto Sans JP italic at weight 400 | Distinct register from the informational lines without needing a second typeface |

**Never use stroke-only text with no fill** (`color: transparent` plus
`-webkit-text-stroke` and nothing else). It was tried once: Chinese
characters have enough overlapping strokes that a pure outline muddies into
an unreadable blob at the points where strokes cross. Every treatment above
keeps a real fill.

**Every caption needs its own background** — a pill, a scrim gradient, or a
solid CTA background — never bare text floating on the raw footage. The
footage behind it is unpredictable (bright walls, patterned boxes, skin
tones), and `hyperframes check`'s contrast audit will fail intermittently if
legibility depends on what happens to be behind the text at that timestamp.

**Default every caption — including the hero/product-name line — to the
bottom safe zone**, the same y-position used for the plain informational
lines. It's tempting to put a short punchy line in a fixed zone near the top
of the frame as a second "layer," but framing varies enough between videos
(and even between beats of the same video) that a fixed top zone will
eventually land on someone's face — this happened in testing with a closer,
higher framing than the earlier videos used. Only place a caption in a
non-bottom zone after checking a real frame from that exact time window and
confirming it's actually clear.

If genuine "text occluded behind the subject" compositing is wanted (not
just requested — confirm this is really what's being asked for, since it's
expensive and fragile): `hyperframes remove-background` (u2net_human_seg,
~2-3 min first run, cached after) can matte the speaker into a transparent
webm to layer over the caption. In testing this introduced a visible
"ghosting" artifact — the matte layer and the original a-roll drifting a
frame or two out of sync, showing a faint double image — likely from
VP9/webm timestamp rounding. Since the four-treatment system above already
achieves a strong "styled caption" look without this layer, skip it unless
the user specifically wants the occlusion effect and is fine debugging sync
if it appears.

## Step 5 — Add the background bed (HeyGen library first)

Pick a track per video from the HeyGen catalog via the media-use skill
(catalog search uses the free allowance, not premium credits). Write the
intent from the product and mood — instrumental, no vocals:

```bash
export PATH="$HOME/.local/bin:$PATH"
node .claude/skills/media-use/scripts/resolve.mjs --type bgm \
  --intent "light cheerful acoustic home cooking background, warm, no vocals" \
  --project <project-dir>
# → resolved bgm_001 → .media/audio/bgm/bgm_001.wav (bgm, 36s)
```

The track's title/description and HeyGen `track_id` are recorded in
`<project-dir>/.media/manifest.jsonl` — mention the description to the user.

Trim to the video length with a fade, then set the volume from measured
loudness rather than a fixed number (catalog tracks are mastered loud,
around -12 LUFS, versus voice around -20 LUFS):

```bash
ffmpeg -y -i .media/audio/bgm/bgm_001.wav -t <video_len> \
  -af "afade=t=in:d=0.4,afade=t=out:st=<video_len-1.1>:d=1.1" -b:a 192k bgm-heygen.mp3
ffmpeg -i <a-roll> -af ebur128 -f null - 2>&1 | grep "I:" | tail -1   # voice LUFS
ffmpeg -i bgm-heygen.mp3 -af ebur128 -f null - 2>&1 | grep "I:" | tail -1
```

Aim for the music ~13–14 dB under the voice: `data-volume ≈ 10^((voice_LUFS
- 14 - bgm_LUFS)/20)` (−20.5 voice / −12 music → ≈0.12). After rendering,
check a pause between lines with `volumedetect` — the bed should sit
around −34 dB there (audible, not competing), and integrated loudness of the
render should stay at the voice's level.

Wire it in as a plain `<audio>` element alongside the a-roll's own audio.

**Fallback** (HeyGen unreachable / sign-in fails):
`python3 <this-skill-dir>/scripts/gen_bgm.py --out bgm.mp3 --duration <video_length + 1>`
at `data-volume="0.16"`, and tell the user the synthesized fallback was used.

## Step 6 — Quality gate (do not skip, do not skip the visual inspection)

```bash
npx hyperframes lint .
```

Fix every error (warnings like `timeline_track_too_dense` are fine to leave).
Then:

```bash
npx hyperframes check . --at <a handful of timestamps across every caption> --snapshots --json
```

Get this to `errorCount: 0` across lint, runtime, layout, and contrast. Then
**use the Read tool to actually look at the PNGs in `snapshots/`** — this is
not optional. The automated checks are geometry/contrast audits; they will
not catch a gradient-filled hero line landing squarely over someone's eyes,
or a ghosting artifact from a desynced matte layer, both of which were only
caught by eyeballing the frames in this workflow's actual test runs. If
something looks wrong, fix the composition and rerun `check` before moving
on — never render past a check you haven't actually looked at.

`check` sometimes drops a few of the requested `--at` timestamps from a batch;
re-run the missing ones on their own so every caption gets eyeballed.

## Step 7 — Render

```bash
npx hyperframes render . -q high --fps <match source fps> -o ./renders/output.mp4
```

Match the output resolution and fps to what Step 1 found on the source
video. File delivery caps at 30 MB; if a render exceeds it, re-encode with
`ffmpeg -c:v libx264 -crf 23 -c:a aac -b:a 128k -movflags +faststart`.

## Step 8 — The cover image is opt-in, always ask first

Once the captioned video is done, **stop and ask the user whether they want
a hook/cover image** before making one. Captions + music + render are the
expected deliverable from "here's my video and script" — a cover is an
extra creative decision layered on top, and should not appear unannounced.

If they say yes:

1. Pick the most expressive/memorable raw frame (usually near the end — a
   genuine smile, a clear product hold) as the background.
2. Build it as its own tiny HyperFrames composition (same font rules as
   above apply) with: a small pill badge (gold background, dark text) near
   the top for the brand/topic; an optional small dark-filled, gold-bordered
   "spec tag" in a corner for one extra selling point (see the note on
   contrast below); a bottom scrim gradient carrying a bold hook headline
   (Noto Sans JP 900, one phrase in gold) plus a smaller subhead line.
3. **Any small tag/label needs a real background fill, not just a border.**
   A bordered-only tag over unpredictable footage (a light curtain, a bright
   wall) can end up nearly invisible — a solid dark fill behind it
   guarantees contrast regardless of what's behind it.
4. Capture it with `npx hyperframes snapshot . --frames 1` and look at the
   PNG before calling it done.

If the user also wants the cover merged into the final deliverable as one
file (rather than two separate files), turn the cover into a short static
video clip and crossfade it into the captioned render:

```bash
ffmpeg -y -loop 1 -i cover.png -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 1.3 -r <fps> -vf "scale=<w>:<h>" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  cover-clip.mp4

ffmpeg -y -i cover-clip.mp4 -i captioned.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=0.3:offset=1.0[v];[0:a][1:a]acrossfade=d=0.3[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -movflags +faststart \
  final-with-cover.mp4
```

The cover holds for 1 second before the 0.3s crossfade begins, so total
output length is `1.3 + captioned_length - 0.3`.

## Step 9 — Deliver honestly

Send the final file(s) with `SendUserFile`. In 2-3 sentences, describe how
the script was split across caption treatments — and if anything needed a
mid-process fix (a layout collision, a font that broke the check pipeline, a
detected mismatch between the script and the footage), say so plainly rather
than presenting the final output as if it went smoothly the first time. The
user should be able to trust that a silent "done" really means nothing
needed fixing.
