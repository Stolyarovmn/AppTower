#!/usr/bin/env python3
from pathlib import Path
import argparse
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SIZES = (16, 32, 48, 128)
COLORS = {
    "body": (18, 24, 31, 255),
    "stroke": (232, 241, 248, 255),
    "cyan": (54, 214, 198, 255),
    "blue": (92, 128, 242, 255),
    "purple": (140, 92, 246, 255),
}


def blend(dst, src):
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    a = sa / 255.0
    old_a = da / 255.0
    out_a = a + old_a * (1 - a)
    if out_a <= 0:
        return (0, 0, 0, 0)
    return (
        round((sr * a + dr * old_a * (1 - a)) / out_a),
        round((sg * a + dg * old_a * (1 - a)) / out_a),
        round((sb * a + db * old_a * (1 - a)) / out_a),
        round(out_a * 255),
    )


def inside_round_rect(x, y, x0, y0, x1, y1, radius):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + radius), x1 - radius)
    cy = min(max(y, y0 + radius), y1 - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def render(size, supersample=4):
    width = height = size * supersample
    pixels = [(0, 0, 0, 0)] * (width * height)
    scale = size * supersample

    def put(x, y, color):
        if 0 <= x < width and 0 <= y < height:
            index = y * width + x
            pixels[index] = blend(pixels[index], color)

    def rounded_rect(x0, y0, x1, y1, radius, color):
        for y in range(max(0, int(y0)), min(height, int(y1) + 1)):
            for x in range(max(0, int(x0)), min(width, int(x1) + 1)):
                if inside_round_rect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius):
                    put(x, y, color)

    def circle(cx, cy, radius, color):
        for y in range(max(0, int(cy - radius - 1)), min(height, int(cy + radius + 2))):
            for x in range(max(0, int(cx - radius - 1)), min(width, int(cx + radius + 2))):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2:
                    put(x, y, color)

    x0, y0, x1, y1, radius = 0.11 * scale, 0.08 * scale, 0.61 * scale, 0.92 * scale, 0.125 * scale
    rounded_rect(x0, y0, x1, y1, radius, COLORS["stroke"])
    stroke = max(supersample, 0.055 * scale)
    rounded_rect(x0 + stroke, y0 + stroke, x1 - stroke, y1 - stroke, max(0, radius - stroke), COLORS["body"])

    bar_height = max(supersample, 0.045 * scale)
    rounded_rect(0.22 * scale, 0.495 * scale, 0.50 * scale, 0.495 * scale + bar_height, bar_height / 2, COLORS["cyan"])
    for cy, color in zip((0.29, 0.50, 0.71), (COLORS["cyan"], COLORS["blue"], COLORS["purple"])):
        circle(0.79 * scale, cy * scale, 0.065 * scale, color)

    result = []
    for out_y in range(size):
        for out_x in range(size):
            samples = [
                pixels[(out_y * supersample + dy) * width + (out_x * supersample + dx)]
                for dy in range(supersample)
                for dx in range(supersample)
            ]
            result.append(tuple(round(sum(sample[channel] for sample in samples) / len(samples)) for channel in range(4)))
    return result


def png_bytes(size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for r, g, b, a in pixels[y * size:(y + 1) * size]:
            raw.extend((r, g, b, a))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def expected_icons():
    return {size: png_bytes(size, render(size)) for size in SIZES}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    icons = expected_icons()
    mismatch = []
    for size, payload in icons.items():
        path = ROOT / "app" / "icons" / f"icon{size}.png"
        if args.check:
            if not path.exists() or path.read_bytes() != payload:
                mismatch.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
            print(f"generated {path.relative_to(ROOT)} ({len(payload)} bytes)")
    if mismatch:
        raise SystemExit("Icon assets are stale; run tools/generate_icons.py: " + ", ".join(mismatch))


if __name__ == "__main__":
    main()
