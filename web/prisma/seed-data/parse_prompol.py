# CSV от скрапера prompol.com (разделитель «;») -> prompol.json для prisma/import-prompol.ts
# python prisma/seed-data/parse_prompol.py путь/к/prompol_products.csv
import csv, json, sys, re

src = sys.argv[1]
out = []
for r in csv.DictReader(open(src, encoding="utf-8-sig", newline=""), delimiter=";"):
    specs = []
    for part in re.split(r";\s+", r["specifications"].strip()):
        if ": " in part:
            k, v = part.split(": ", 1)
            specs.append([k.strip(), re.sub(r"\s+", " ", v).strip()])
    out.append({
        "title": r["title"].strip(),
        "url": r["url"],
        "brand": r["brand"].strip(),
        "price": float(r["price"]) if r["price"].strip() else None,
        "path": [p.strip() for p in r["category_path"].split(">")],
        "intro": r["intro"].strip(),
        "description": r["description"].strip(),
        "specs": specs,
        "images": [u.strip() for u in r["images_all"].split(" | ") if u.strip()],
    })
json.dump(out, open(__file__.replace("parse_prompol.py", "prompol.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out))
