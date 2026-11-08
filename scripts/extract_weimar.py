"""Usage: python3 scripts/extract_weimar.py /absolute/path/wjazzd.db

Read-only extraction; no transcribed solo notes, recorded audio, or melodies.
Run node scripts/validate-data.mjs afterwards to classify supported charts.
"""
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

source = Path(sys.argv[1]).resolve()
connection = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
connection.row_factory = sqlite3.Row
info = dict(connection.execute("select * from db_info").fetchone())
songs = []
for row in connection.execute("select melid,title,performer,key,signature,chord_changes from solo_info order by title,performer,melid"):
    if not row["chord_changes"]:
        continue
    songs.append({"id": row["melid"], "title": row["title"], "performer": row["performer"], "key": row["key"], "signature": row["signature"], "chords": row["chord_changes"], "supported": False})
result = {
    "source": "https://jazzomat.hfm-weimar.de/download/downloads/wjazzd.db",
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "database": info,
    "license": "ODbL-1.0",
    "contents_license": "DbCL-1.0",
    "songs": songs,
}
target = Path(__file__).resolve().parent.parent / "data" / "weimar.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"Extracted {len(songs)} charts to {target}")
