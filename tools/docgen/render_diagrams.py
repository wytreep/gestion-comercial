#!/usr/bin/env python3
"""Render every Mermaid diagram in docs/ to a high-resolution PNG.

The SVG comes from mermaid.ink (with Kroki as fallback). Chrome rasterises it at
2x so the figure keeps sharp text when it is placed in Word at 16 cm width.
The .mmd source is kept next to the PNG so a diagram can be edited and rebuilt.

Usage:  py -3 tools/docgen/render_diagrams.py
"""

from __future__ import annotations

import base64
import json
import math
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
OUT = DOCS / "entregables" / "word" / "assets" / "diagrams"
SRC = OUT / "src"
IMAGES = DOCS / "entregables" / "word" / "assets" / "images"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SCALE = 3


def mermaid_blocks(text: str):
    pattern = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)
    for match in pattern.finditer(text):
        yield match.start(), match.group(1).strip("\n")


def caption_for(text: str, position: int) -> str:
    before = text[:position]
    headings = re.findall(r"^(#{1,6})\s+(.+)$", before, re.MULTILINE)
    if not headings:
        return "Diagrama"
    title = headings[-1][1].strip()
    title = re.sub(r"^\d+\s*[·.\-]\s*", "", title)
    title = re.sub(r"^ADR\s+\d+\s*[—-]\s*", "", title)
    return title


def fetch_svg(code: str) -> str:
    b64 = base64.urlsafe_b64encode(code.encode("utf-8")).decode("ascii").rstrip("=")
    url = f"https://mermaid.ink/svg/{b64}"
    req = urllib.request.Request(url, headers={"User-Agent": "gcom-docgen/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.read().decode("utf-8")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        print(f"  mermaid.ink fallo ({exc}); probando Kroki")
    req = urllib.request.Request(
        "https://kroki.io/mermaid/svg",
        data=code.encode("utf-8"),
        headers={"Content-Type": "text/plain", "User-Agent": "gcom-docgen/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read().decode("utf-8")


def svg_metrics(svg: str) -> tuple[float, float]:
    """Tamaño natural del diagrama en píxeles CSS (96 px = 1 in)."""
    match = re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', svg)
    if match:
        return float(match.group(3)), float(match.group(4))
    match = re.search(r'width="([\d.]+)"[^>]*height="([\d.]+)"', svg)
    if match:
        return float(match.group(1)), float(match.group(2))
    return 1000.0, 600.0


def render_png(svg: str, png: Path, css_w: float, css_h: float) -> tuple[int, int]:
    # El diagrama se captura a su tamaño natural por 3: así el texto conserva
    # el tamaño relativo que le dio Mermaid y no queda gigante al ampliarlo.
    scale = SCALE
    if css_h * scale > 14000:
        scale = max(1.0, 14000 / css_h)
    if css_w * scale > 12000:
        scale = max(1.0, 12000 / css_w)

    svg = re.sub(
        r'style="max-width:[^"]*"',
        f'style="max-width:none;width:{css_w:.0f}px;height:auto"',
        svg,
        count=1,
    )
    html = png.with_suffix(".html")
    html.write_text(
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}</style></head>"
        f"<body>{svg}</body></html>",
        encoding="utf-8",
    )

    profile = OUT / ".chrome-profile"
    cmd = [
        str(CHROME),
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--no-first-run",
        "--hide-scrollbars",
        f"--user-data-dir={profile}",
        f"--force-device-scale-factor={scale}",
        f"--window-size={math.ceil(css_w)},{math.ceil(css_h)}",
        f"--screenshot={png}",
        html.as_uri(),
    ]
    subprocess.run(cmd, capture_output=True, timeout=180)
    for _ in range(20):
        if png.exists() and png.stat().st_size > 0:
            break
        time.sleep(0.25)

    image = Image.open(png).convert("RGB")
    background = Image.new("RGB", image.size, (255, 255, 255))
    box = ImageChops.difference(image, background).getbbox()
    if box is None:
        raise RuntimeError(f"La captura de {png.name} salió en blanco")
    padding = 20
    left = max(box[0] - padding, 0)
    top = max(box[1] - padding, 0)
    right = min(box[2] + padding, image.width)
    bottom = min(box[3] + padding, image.height)
    image = image.crop((left, top, right, bottom))
    image.save(png, "PNG", optimize=True)
    html.unlink(missing_ok=True)
    return image.size


def render_assets() -> int:
    """Rasteriza los SVG de docs/assets (mockups) para poder insertarlos en Word."""
    sources = sorted((DOCS / "assets").glob("*.svg"))
    if not sources:
        return 0
    IMAGES.mkdir(parents=True, exist_ok=True)
    entries = []
    for svg_path in sources:
        svg = svg_path.read_text(encoding="utf-8")
        css_w, css_h = svg_metrics(svg)
        png = IMAGES / f"{svg_path.stem}.png"
        size = render_png(svg, png, css_w, css_h)
        entries.append(
            {
                "slug": svg_path.stem,
                "source": svg_path.relative_to(DOCS).as_posix(),
                "png": png.relative_to(ROOT).as_posix(),
                "width": size[0],
                "height": size[1],
                "css_width": round(css_w, 1),
                "css_height": round(css_h, 1),
            }
        )
        print(f"[imagen] {svg_path.name}")
    (IMAGES / "manifest.json").write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return len(entries)


def main() -> int:
    if not CHROME.exists():
        print(f"No se encontró Chrome en {CHROME}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)

    files = sorted(
        path
        for path in DOCS.rglob("*.md")
        if "entregables" not in path.parts and "legal" not in path.parts
    )
    entries = []
    total = 0
    for path in files:
        text = path.read_text(encoding="utf-8")
        blocks = list(mermaid_blocks(text))
        if not blocks:
            continue
        rel = path.relative_to(DOCS).as_posix()
        for index, (position, code) in enumerate(blocks, start=1):
            slug = f"{path.stem}-{index:02d}"
            slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", slug)
            caption = caption_for(text, position)
            png = OUT / f"{slug}.png"
            mmd = SRC / f"{slug}.mmd"
            mmd.write_text(code + "\n", encoding="utf-8")
            print(f"[{rel} #{index}] {caption}")
            try:
                # Fijar la fuente evita que mermaid.ink mida con una fuente y
                # dibuje con otra, que es lo que recortaba textos del ER.
                render_code = (
                    '%%{init: {"themeVariables": {"fontFamily": "Arial"}}}%%\n' + code
                )
                svg = fetch_svg(render_code)
                css_w, css_h = svg_metrics(svg)
                size = render_png(svg, png, css_w, css_h)
            except Exception as exc:  # noqa: BLE001
                print(f"  ERROR: {exc}")
                return 2
            entries.append(
                {
                    "slug": slug,
                    "source": rel,
                    "index": index,
                    "caption": caption,
                    "png": png.relative_to(ROOT).as_posix(),
                    "mmd": mmd.relative_to(ROOT).as_posix(),
                    "width": size[0],
                    "height": size[1],
                    "css_width": round(css_w, 1),
                    "css_height": round(css_h, 1),
                }
            )
            total += 1

    manifest = OUT / "manifest.json"
    manifest.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    images = render_assets()
    print(f"\n{total} diagramas y {images} imágenes en {OUT.parent}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
