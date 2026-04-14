#!/usr/bin/env python3
"""
Quick add artwork to kids-gallery.

Usage:
  python3 add.py yoga /path/to/file.pdf
  python3 add.py siyu /path/to/photo.jpg
  python3 add.py yoga /path/to/folder/   # add all PDFs/images in folder

Options:
  --hierarchical     Upload the file/folder hierarchy as-is (for multi-level folders).
  --push             Auto git add, commit & push after adding.
  --title "My Title" Set a custom title (only for single-file adds).
  --desc  "描述"      Set a custom description.
"""

import sys, os, json, shutil, glob, argparse
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE  = os.path.join(SCRIPT_DIR, "data", "artworks.json")
IMG_BASE   = os.path.join(SCRIPT_DIR, "images", "artworks")

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Updated {DATA_FILE}")

def pdf_to_images(pdf_path, out_dir):
    """Convert a PDF to JPG images. Returns list of output filenames."""
    try:
        import fitz
    except ImportError:
        print("ERROR: PyMuPDF not installed. Run: pip install pymupdf")
        sys.exit(1)

    doc = fitz.open(pdf_path)
    base = os.path.splitext(os.path.basename(pdf_path))[0]
    safe = base.replace(" ", "_").replace(".", "-")
    outputs = []

    for i, page in enumerate(doc):
        zoom = min(2.0, 2400 / max(page.rect.width, page.rect.height))
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        fname = f"{safe}_p{i+1}.jpg" if len(doc) > 1 else f"{safe}.jpg"
        out_path = os.path.join(out_dir, fname)
        pix.save(out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  Converted: {fname} ({pix.width}x{pix.height}, {size_kb:.0f}KB)")
        outputs.append(fname)
    doc.close()
    return outputs

def copy_image(src_path, out_dir):
    """Copy an image file to out_dir. Returns the filename."""
    fname = os.path.basename(src_path).replace(" ", "_")
    dst = os.path.join(out_dir, fname)
    shutil.copy2(src_path, dst)
    size_kb = os.path.getsize(dst) / 1024
    print(f"  Copied: {fname} ({size_kb:.0f}KB)")
    return fname

def guess_date(filename):
    """Try to extract date from filename, fallback to today."""
    import re
    m = re.search(r'(\d{4})[\.\-_](\d{1,2})[\.\-_](\d{1,2})', filename)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    m = re.search(r'(\d{4})[\.\-_](\d{1,2})', filename)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    return datetime.now().strftime("%Y-%m")

def process_file(filepath, child, out_dir, title=None, desc=None):
    """Process a single file (PDF or image). Returns list of new entries."""
    ext = os.path.splitext(filepath)[1].lower()
    entries = []
    date = guess_date(os.path.basename(filepath))

    if ext == ".pdf":
        fnames = pdf_to_images(filepath, out_dir)
        for i, fname in enumerate(fnames):
            t = title if (title and len(fnames) == 1) else f"{title or os.path.splitext(os.path.basename(filepath))[0]} p{i+1}" if len(fnames) > 1 else (title or os.path.splitext(os.path.basename(filepath))[0])
            entries.append({
                "file": fname,
                "title": t,
                "date": date,
                "description": desc or ""
            })
    elif ext in (".jpg", ".jpeg", ".png", ".webp", ".heic"):
        fname = copy_image(filepath, out_dir)
        entries.append({
            "file": fname,
            "title": title or os.path.splitext(os.path.basename(filepath))[0],
            "date": date,
            "description": desc or ""
        })
    else:
        print(f"  Skipping unsupported file: {filepath}")

    return entries

def main():
    parser = argparse.ArgumentParser(description="Add artwork to kids-gallery")
    parser.add_argument("child", choices=["yoga", "siyu"], help="Which child")
    parser.add_argument("path", help="Path to PDF, image, or folder")
    parser.add_argument("--push", action="store_true", help="Auto git commit & push")
    parser.add_argument("--title", default=None, help="Custom title")
    parser.add_argument("--desc", default=None, help="Custom description")
    args = parser.parse_args()

    out_dir = os.path.join(IMG_BASE, args.child)
    os.makedirs(out_dir, exist_ok=True)

    data = load_data()
    if args.child not in data:
        data[args.child] = []

    new_entries = []
    path = os.path.expanduser(args.path)

    if os.path.isdir(path):
        # Process all PDFs and images in the folder
        files = sorted(glob.glob(os.path.join(path, "*")))
        files = [f for f in files if os.path.splitext(f)[1].lower() in (".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic")]
        if not files:
            print(f"No supported files found in {path}")
            sys.exit(1)
        print(f"Found {len(files)} file(s) in {path}")
        for f in files:
            print(f"\nProcessing: {os.path.basename(f)}")
            new_entries.extend(process_file(f, args.child, out_dir, desc=args.desc))
    elif os.path.isfile(path):
        print(f"Processing: {os.path.basename(path)}")
        new_entries = process_file(path, args.child, out_dir, title=args.title, desc=args.desc)
    else:
        print(f"ERROR: {path} not found")
        sys.exit(1)

    if not new_entries:
        print("No new images added.")
        sys.exit(0)

    data[args.child].extend(new_entries)
    save_data(data)

    print(f"\n✅ Added {len(new_entries)} artwork(s) for {args.child}")

    if args.push:
        print("\nCommitting and pushing...")
        os.chdir(SCRIPT_DIR)
        os.system("git add .")
        os.system(f'git commit -m "Add {len(new_entries)} artwork(s) for {args.child}"')
        os.system("git push")
        print("🚀 Pushed to GitHub!")
    else:
        print("\nTo publish, run:")
        print(f"  cd {SCRIPT_DIR} && git add . && git commit -m 'Add new artwork' && git push")

if __name__ == "__main__":
    main()
