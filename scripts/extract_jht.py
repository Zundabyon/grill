"""Extract only three requested standards, retaining their exact measure/beat positions.
Usage: python3 scripts/extract_jht.py /path/to/treebank.json
"""
import hashlib
import json
import sys
from pathlib import Path

REVISION = "26ec6170939054f08ba1b63db44712636d0d1db3"
SELECTED = {
    "Fly Me To The Moon": ("jht:fly-me-to-the-moon", ["Fly Me to the Moon", "フライミートゥーザムーン"]),
    "Autumn Leaves": ("jht:autumn-leaves", ["枯葉", "オータムリーブス"]),
    "Blue Bossa": ("jht:blue-bossa", ["ブルーボッサ"]),
}
source = Path(sys.argv[1])
data = json.loads(source.read_text())
authors = "D. Harasim, C. Finkensiep, P. Ericson, T. J. O'Donnell, M. Rohrmeier"
songs = []
for original in data:
    if original["title"] not in SELECTED:
        continue
    assert original["meter"] == {"numerator": 4, "denominator": 4}
    count = len(original["chords"])
    assert len(original["measures"]) == len(original["beats"]) == count
    bars = []
    for measure in range(1, max(original["measures"]) + 1):
        changes = [(beat, chord.replace("%7", "m7b5").replace("%", "m7b5"))
                   for m, beat, chord in zip(original["measures"], original["beats"], original["chords"]) if m == measure]
        assert changes and changes[0][0] == 1
        assert all(isinstance(b, int) and 1 <= b <= 4 for b, _ in changes)
        assert len({b for b, _ in changes}) == len(changes)
        slots = []
        for beat in range(1, 5):
            slots.append([chord for onset, chord in changes if onset <= beat][-1])
        bars.append(" ".join(slots))
    identifier, aliases = SELECTED[original["title"]]
    songs.append({
        "id": identifier, "title": original["title"], "aliases": aliases,
        "performer": "JHT収録版", "key": original["key"][0].upper() + original["key"][1:].replace("-", "b") + ("-min" if original["key"][0].islower() else "-maj"),
        "signature": "4/4", "chords": " | ".join(bars), "supported": True,
        "provenance": {
            "dataset": "Jazz Harmony Treebank", "authors": authors,
            "url": "https://github.com/DCMLab/JazzHarmonyTreebank",
            "revision": REVISION, "license": "CC BY-NC-SA 4.0",
            "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "citation": "Harasim et al. (2020), The Jazz Harmony Treebank, ISMIR 2020, pp. 207–215. https://doi.org/10.5281/zenodo.4245406",
            "changes": "Only chord changes extracted; half-diminished %7 normalized to m7b5; each measure expanded to four beat slots. Melody, lyrics, and analysis trees excluded.",
        },
        "original": {k: original[k] for k in ["title", "measures", "beats", "chords", "key", "meter", "composers"]},
    })
assert len(songs) == 3
result = {"source_revision": REVISION, "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
          "license": "CC BY-NC-SA 4.0", "songs": songs}
target = Path(__file__).resolve().parent.parent / "data" / "jht-standards.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print("Extracted", len(songs), "standards")
