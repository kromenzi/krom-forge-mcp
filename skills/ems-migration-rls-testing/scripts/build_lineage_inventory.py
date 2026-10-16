#!/usr/bin/env python3
"""Build a reviewable inventory for missing or uncertain migrations.

Input JSON may contain migration IDs or objects:
  {"migrations": ["001", {"id":"002", "status":"missing"}]}
"""
import argparse, csv, json
from pathlib import Path

FIELDS = ["migration_id", "status", "confidence", "known_objects", "depends_on", "evidence", "verification_test", "owner", "decision"]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", help="JSON containing migrations")
    p.add_argument("--out", default="migration-lineage-inventory.csv")
    p.add_argument("--count", type=int, default=None, help="Expected count; fail if different")
    args = p.parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    raw = data.get("migrations", data if isinstance(data, list) else [])
    rows = []
    for item in raw:
        if isinstance(item, str): item = {"id": item}
        row = {field: item.get(field, "") for field in FIELDS}
        row["migration_id"] = item.get("id", item.get("migration_id", ""))
        row["status"] = row["status"] or "unknown"
        row["confidence"] = row["confidence"] or "unknown"
        row["decision"] = row["decision"] or "HOLD"
        rows.append(row)
    if args.count is not None and len(rows) != args.count:
        raise SystemExit(f"Expected {args.count} migrations, found {len(rows)}")
    if not rows: raise SystemExit("No migrations supplied")
    ids = [r["migration_id"] for r in rows]
    duplicates = sorted({x for x in ids if ids.count(x) > 1 and x})
    if duplicates: raise SystemExit("Duplicate migration IDs: " + ", ".join(duplicates))
    out = Path(args.out)
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS); writer.writeheader(); writer.writerows(rows)
    print(json.dumps({"output": str(out), "count": len(rows), "unknown": sum(r["confidence"] == "unknown" for r in rows), "hold": sum(r["decision"] == "HOLD" for r in rows)}, ensure_ascii=False))

if __name__ == "__main__": main()
