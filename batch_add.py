#!/usr/bin/env python3
"""
Batch-add PDF artworks from bro_paint folder to Yoga's gallery.
Converts PDFs to JPG, adds watermark, groups multi-page PDFs as one entry,
and updates artworks.json in the correct gallery format.
"""

import os, sys, json, math, re
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE  = os.path.join(SCRIPT_DIR, "data", "artworks.json")
IMG_DIR    = os.path.join(SCRIPT_DIR, "images", "artworks", "yoga")
ORIG_DIR   = os.path.join(IMG_DIR, "_original")
WATERMARK_TEXT = "© Yoga"

SRC_DIR = "/Users/liangguo/Library/Mobile Documents/com~apple~CloudDocs/bro_paint"

# Chinese-to-English title mapping for nicer gallery display
TITLE_MAP = {
    "放大镜和细菌": "Magnifying Glass & Germs",
    "火车": "Train",
    "兔子和泽塔": "Rabbit & Zeta",
    "夹机械臂": "Claw Machine Arm",
    "老人": "Old Man",
    "城堡": "Castle",
    "电话传声": "Telephone",
    "手套": "Gloves",
    "海底世界": "Underwater World",
    "康定斯基的抽象收银机": "Kandinsky Cash Register",
    "字母": "Letters",
    "包": "Bag",
    "小孩和蚂蚁": "Kid & Ants",
    "小汽车和迷宫": "Car & Maze",
    "瓢虫": "Ladybug",
    "美善公主": "Princess Meishan",
    "太空": "Space",
    "水管": "Pipes",
    "刺猬房": "Hedgehog House",
    "基地": "Base",
    "西瓜房": "Watermelon House",
    "年兽": "Nian Beast",
    "巴斯奎特风格的船": "Basquiat-Style Boat",
    "船": "Boat",
    "袜子店": "Sock Shop",
    "蚯蚓": "Earthworm",
    "松鼠的房子 2": "Squirrel House 2",
    "厨房": "Kitchen",
    "海上城堡": "Sea Castle",
}

def add_watermark(src_path, dst_path):
    """Burn tiled diagonal watermark into image."""
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size

    diag = math.sqrt(w * w + h * h)
    font_size = max(20, int(diag * 0.03))

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()

    tmp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = tmp_draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    step_x = tw + int(tw * 0.6)
    step_y = th + int(th * 2.5)

    canvas_size = int(diag * 1.5)
    txt_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    txt_draw = ImageDraw.Draw(txt_layer)

    for y in range(0, canvas_size, step_y):
        for x in range(0, canvas_size, step_x):
            txt_draw.text((x+1, y+1), WATERMARK_TEXT, font=font, fill=(0, 0, 0, 12))
            txt_draw.text((x, y), WATERMARK_TEXT, font=font, fill=(255, 255, 255, 22))

    txt_layer = txt_layer.rotate(25, expand=False, center=(canvas_size // 2, canvas_size // 2))
    cx, cy = canvas_size // 2, canvas_size // 2
    txt_layer = txt_layer.crop((cx - w // 2, cy - h // 2, cx - w // 2 + w, cy - h // 2 + h))

    result = Image.alpha_composite(img, txt_layer).convert("RGB")
    result.save(dst_path, "JPEG", quality=90)


def guess_date(filename):
    """Extract date from filename like '2025.10.21 Yoga ...' or '2025．11.6 ...'"""
    # Normalize fullwidth dot
    fn = filename.replace("．", ".")
    m = re.search(r'(\d{4})[\.\-_](\d{1,2})[\.\-_](\d{1,2})', fn)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r'(\d{4})[\.\-_](\d{1,2})', fn)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    return "2026-04"


def guess_title(filename):
    """Extract a nice title from filename."""
    fn = filename.replace("．", ".")
    # Remove date prefix, "yoga"/"Yoga", and extension
    name = os.path.splitext(fn)[0]
    # Remove date like 2025.10.21 or 2026.04.15
    name = re.sub(r'\d{4}[\.\-_]\d{1,2}([\.\-_]\d{1,2})?', '', name)
    # Remove yoga/Yoga
    name = re.sub(r'[Yy]oga', '', name, flags=re.IGNORECASE)
    # Clean up
    name = name.strip(' ._-')

    if not name:
        return "Artwork"

    # Try to find English translation
    for cn, en in TITLE_MAP.items():
        if cn in name:
            return en

    return name


def make_safe_name(filename):
    """Create a filesystem-safe name from PDF filename."""
    fn = filename.replace("．", ".")
    name = os.path.splitext(fn)[0]
    safe = name.replace(" ", "_").replace(".", "-")
    # Remove any non-ascii-safe chars for filenames but keep Chinese
    return safe


def process_pdf(filepath, filename):
    """Process a single PDF. Returns a gallery entry dict or None."""
    import fitz

    doc = fitz.open(filepath)
    safe = make_safe_name(filename)
    date = guess_date(filename)
    title = guess_title(filename)

    images_list = []

    for i, page in enumerate(doc):
        zoom = min(2.0, 2400 / max(page.rect.width, page.rect.height))
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))

        if len(doc) > 1:
            fname = f"{safe}_p{i+1}.jpg"
        else:
            fname = f"{safe}.jpg"

        # Save original
        orig_path = os.path.join(ORIG_DIR, fname)
        pix.save(orig_path)

        # Save watermarked
        wm_path = os.path.join(IMG_DIR, fname)
        add_watermark(orig_path, wm_path)

        size_kb = os.path.getsize(wm_path) / 1024
        print(f"  {fname} ({pix.width}x{pix.height}, {size_kb:.0f}KB)")

        caption = f"{title} — page {i+1}" if len(doc) > 1 else ""
        images_list.append({
            "file": fname,
            "caption": caption
        })

    doc.close()

    if not images_list:
        return None

    entry = {
        "title": title,
        "date": date,
        "description": "",
        "images": images_list
    }
    return entry


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(ORIG_DIR, exist_ok=True)

    # Load existing data
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Get existing filenames to avoid duplicates
    existing_files = set()
    for entry in data:
        for img in entry["images"]:
            existing_files.add(img["file"])

    # List all PDFs
    pdfs = sorted([f for f in os.listdir(SRC_DIR) if f.lower().endswith(".pdf")])
    # Skip "扫描文稿.pdf" which seems like a generic scan
    pdfs = [f for f in pdfs if f != "扫描文稿.pdf"]

    print(f"Found {len(pdfs)} PDF files to process\n")

    new_entries = []
    skipped = 0

    for pdf_name in pdfs:
        safe = make_safe_name(pdf_name)
        # Check if already processed (single-page or multi-page)
        test_fname = f"{safe}.jpg"
        test_fname_p1 = f"{safe}_p1.jpg"
        if test_fname in existing_files or test_fname_p1 in existing_files:
            print(f"SKIP (already exists): {pdf_name}")
            skipped += 1
            continue

        print(f"Processing: {pdf_name}")
        filepath = os.path.join(SRC_DIR, pdf_name)
        entry = process_pdf(filepath, pdf_name)
        if entry:
            new_entries.append(entry)
            for img in entry["images"]:
                existing_files.add(img["file"])

    if new_entries:
        data.extend(new_entries)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Added {len(new_entries)} new artwork(s)")
    else:
        print("\nNo new artworks to add.")

    if skipped:
        print(f"   Skipped {skipped} already-existing artwork(s)")
    print(f"   Total artworks in gallery: {len(data)}")


if __name__ == "__main__":
    main()
