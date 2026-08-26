#!/usr/bin/env python3
"""
evals/judge/build_pack.py — blind council pack compositor (rubric §c).

  python3 evals/judge/build_pack.py [--round p5-council]

Consumes the seeded pairs manifest built by runner.ts
(results/<round>/judge/pairs.json — 20 still pairs + 4 video pairs, per-judge
randomized L/R assignments) and produces the physical blind materials:

  evals/judge/pack/seat-{1..5}/pair-<id>.png   side-by-side composites,
                                               labels 'A' / 'B' only
  evals/judge/pack/manifest.json               judge-visible: pair ids, kind,
                                               viewport, axes, strip rule —
                                               NO origin information
  evals/judge/pack/answers.json                SEALED: which side is ours,
                                               per seat per pair. Judges
                                               never see this file.

Video pairs are judged from MOTION STRIPS: 12 stills per side at identical
normalized timeline points (scroll clips: equal steps across each clip's
scroll phase — ours from reference/ours/videos.json, source from the frozen
kit's videoRuns metadata; interaction clips: equal steps across the whole
clip minus 0.5s head/tail). Frames are numbered 01→12 in time order so
judges without video playback can read the motion.

Re-encoding through PIL guarantees no EXIF/tEXt metadata survives into the
pack. Tools: ~/.local/bin/ffmpeg (static arm64), Pillow. No repo deps.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EVALS = Path(__file__).resolve().parent.parent
REPO = EVALS.parent
FFMPEG = str(Path.home() / ".local/bin/ffmpeg")
PACK = EVALS / "judge" / "pack"
FONT = "/System/Library/Fonts/Helvetica.ttc"

BG = (28, 29, 32)
FG = (240, 240, 242)
DIM = (150, 152, 158)
BORDER = (70, 72, 78)
STRIP_POINTS = 12


def ffmpeg_duration(video: Path) -> float:
    p = subprocess.run([FFMPEG, "-i", str(video)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        sys.exit(f"cannot read duration of {video}")
    h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mn * 60 + s


def extract_frame(video: Path, t: float, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(video),
         "-frames:v", "1", str(out)],
        check=True,
    )


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def scroll_windows() -> dict:
    """Per-video (scroll-phase) sampling windows in video time."""
    ours_meta = json.loads((EVALS / "reference/ours/videos.json").read_text())["clips"]
    src_meta = json.loads((EVALS / "reference/source/manifest.json").read_text())["videoRuns"]
    windows = {}
    # ours scroll clips: measured during capture (evals/videos.ts)
    for key in ("desktop_scroll", "mobile_scroll"):
        c = ours_meta[key]
        windows[str(EVALS / "reference" / c["file"])] = (c["windowStartS"], c["windowEndS"])
    # source scroll clips: total duration minus 2s tail, minus measured scroll phase
    for vp in ("desktop", "mobile"):
        v = EVALS / f"reference/source/videos/{vp}_scroll.webm"
        dur = ffmpeg_duration(v)
        scroll_s = float(src_meta[f"{vp}_scroll"]["scrollDurationSec"])
        windows[str(v)] = (dur - 2.0 - scroll_s, dur - 2.0)
    return windows


def content_onset(video: Path, tmp: Path) -> float:
    """First timestamp where the frame stops being loader/blank (same rule
    for both sides): grayscale stddev >= 18, scanned at 0.5s steps."""
    d = ffmpeg_duration(video)
    t = 0.5
    while t < min(15.0, d - 1.0):
        fp = tmp / "onset-probe.png"
        extract_frame(video, t, fp)
        img = Image.open(fp).convert("L").resize((160, 90))
        px = list(img.getdata())
        mean = sum(px) / len(px)
        std = (sum((v - mean) ** 2 for v in px) / len(px)) ** 0.5
        if std >= 18:
            print(f"  onset {video.name}: {t:.1f}s (std {std:.1f})")
            return t
        t += 0.5
    print(f"  onset {video.name}: fallback 0.5s")
    return 0.5


def strip_times(video: Path, windows: dict, tmp: Path) -> list[float]:
    key = str(video)
    if key in windows:  # scroll clip: constant-rate scroll phase
        a, b = windows[key]
    else:  # interaction clip: content onset -> tail
        d = ffmpeg_duration(video)
        a, b = content_onset(video, tmp), max(0.6, d - 0.5)
    return [a + k * (b - a) / (STRIP_POINTS - 1) for k in range(STRIP_POINTS)]


def build_strip_panel(frames: list[Path], viewport: str) -> Image.Image:
    """Numbered grid panel: desktop 3x4 (w=380), mobile 6x2 (w=170)."""
    cols, rows, w = (3, 4, 380) if viewport == "desktop" else (6, 2, 170)
    gap = 10
    first = Image.open(frames[0])
    h = round(first.height * w / first.width)
    panel = Image.new("RGB", (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), BG)
    draw = ImageDraw.Draw(panel)
    f = font(22)
    for i, fp in enumerate(frames):
        img = Image.open(fp).convert("RGB").resize((w, h), Image.LANCZOS)
        x = (i % cols) * (w + gap)
        y = (i // cols) * (h + gap)
        panel.paste(img, (x, y))
        tag = f"{i + 1:02d}"
        draw.rectangle([x, y, x + 42, y + 30], fill=(0, 0, 0))
        draw.text((x + 8, y + 4), tag, font=f, fill=(255, 255, 255))
        draw.rectangle([x, y, x + w - 1, y + h - 1], outline=BORDER, width=1)
    return panel


def compose_pair(left: Image.Image, right: Image.Image, pair_id: str, caption: str, out: Path) -> None:
    """A | B side-by-side with labels; equal heights."""
    target_h = 900
    def fit(im: Image.Image) -> Image.Image:
        w = round(im.width * target_h / im.height)
        return im.convert("RGB").resize((w, target_h), Image.LANCZOS)

    L, R = fit(left), fit(right)
    margin, gap, label_band, caption_band = 48, 72, 96, 64
    W = margin * 2 + L.width + gap + R.width
    H = label_band + target_h + caption_band
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    f_label, f_cap = font(60), font(26)

    xL, xR, y0 = margin, margin + L.width + gap, label_band
    canvas.paste(L, (xL, y0))
    canvas.paste(R, (xR, y0))
    for x, im, lab in ((xL, L, "A"), (xR, R, "B")):
        draw.rectangle([x - 1, y0 - 1, x + im.width, y0 + target_h], outline=BORDER, width=1)
        tw = draw.textlength(lab, font=f_label)
        draw.text((x + im.width / 2 - tw / 2, 14), lab, font=f_label, fill=FG)
    cap = f"{pair_id}   ·   {caption}"
    draw.text((margin, label_band + target_h + 16), cap, font=f_cap, fill=DIM)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "PNG")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", default="p5-council")
    args = ap.parse_args()

    pairs_file = EVALS / "results" / args.round / "judge" / "pairs.json"
    manifest = json.loads(pairs_file.read_text())
    pair_by_id = {p["id"]: p for p in manifest["stillPairs"] + manifest["videoPairs"]}
    windows = scroll_windows()

    # -- strip panels, one per distinct video file ---------------------------
    tmp = Path(tempfile.mkdtemp(prefix="onehertz-strips-"))
    panels: dict[str, Image.Image] = {}
    for p in manifest["videoPairs"]:
        for side_file in (p["ours"], p["source"]):
            if side_file in panels:
                continue
            video = REPO / side_file
            if not video.exists():
                sys.exit(f"missing video: {video}")
            times = strip_times(video, windows, tmp)
            frames = []
            for k, t in enumerate(times):
                fp = tmp / f"{abs(hash(side_file))}" / f"f{k:02d}.png"
                extract_frame(video, t, fp)
                frames.append(fp)
            panels[side_file] = build_strip_panel(frames, p["viewport"])
            print(f"strip panel: {side_file} ({len(times)} frames)")

    # -- per-seat composites --------------------------------------------------
    if PACK.exists():
        for f in PACK.rglob("*"):
            if f.is_file():
                f.unlink()
    answers: dict[str, dict[str, str]] = {}
    seat_files = []
    for assignment in manifest["assignments"]:
        seat = assignment["judge"]
        seat_dir = PACK / f"seat-{seat}"
        answers[str(seat)] = {}
        files_entry = []
        for ap_ in assignment["pairs"]:
            pid = ap_["pairId"]
            spec = pair_by_id[pid]
            caption = (
                "frames 01-12 = equal timeline steps, read left-to-right, top-to-bottom"
                if spec["kind"] == "video"
                else f"matched moment · {spec['viewport']}"
            )
            if spec["kind"] == "still":
                left = Image.open(REPO / ap_["A"])
                right = Image.open(REPO / ap_["B"])
            else:
                left, right = panels[ap_["A"]], panels[ap_["B"]]
            out = seat_dir / f"pair-{pid}.png"
            compose_pair(left, right, pid, caption, out)
            answers[str(seat)][pid] = ap_["oursIs"]
            files_entry.append({
                "pairId": pid,
                "kind": spec["kind"],
                "viewport": spec["viewport"],
                "axes": spec["axes"],
                "file": str(out.relative_to(PACK)),
            })
        seat_files.append({"seat": seat, "files": files_entry})
        print(f"seat-{seat}: {len(files_entry)} composites")

    (PACK / "manifest.json").write_text(json.dumps({
        "round": manifest["round"],
        "rubricVersion": manifest["rubricVersion"],
        "seed": manifest["seed"],
        "builtAt": manifest["builtAt"],
        "presentation": "Each PNG shows two candidates, 'A' and 'B'. Left/right is randomized per pair per seat (seeded). Nothing in the image or filename identifies origin.",
        "motionStrips": {
            "pointsPerStrip": STRIP_POINTS,
            "rule": "scroll clips sampled at equal steps across each clip's constant-rate scroll phase; interaction clips at equal steps from content onset (loader end, same luma-stddev rule both sides) to 0.5s before the end; frames numbered 01-12 in time order",
        },
        "seats": seat_files,
    }, indent=2) + "\n")
    (PACK / "answers.json").write_text(json.dumps({
        "SEALED": "Ground truth for gate math. Judges must NEVER see this file.",
        "round": manifest["round"],
        "seed": manifest["seed"],
        "meaning": "value = the side ('A' or 'B') that is OURS for that seat's rendering of the pair",
        "seats": answers,
    }, indent=2) + "\n")
    print(f"\npack -> {PACK}")


if __name__ == "__main__":
    main()
