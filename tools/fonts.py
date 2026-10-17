#!/usr/bin/env python3
"""Optional one-time font optimization. Requires fonttools==4.66.1 and brotli==1.2.0."""
import argparse
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("originals", type=Path)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "static/fonts"
    for weight in ("Regular", "Medium"):
        font = TTFont(args.originals / f"SourceCodePro-{weight}.woff2")
        options = subset.Options()
        options.flavor = "woff2"
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=list(range(256)) + list(range(0x2000, 0x2070)) + list(range(0x2190, 0x2194)) + [0x2212])
        sub.subset(font)
        # Adobe reserves 'Source'. Modified subsets use distinct family/PostScript names.
        for record in font["name"].names:
            names = {1: "BirLUG Mono", 2: weight, 3: f"BirLUGMono-{weight}", 4: f"BirLUG Mono {weight}",
                     6: f"BirLUGMono-{weight}", 16: "BirLUG Mono", 17: weight}
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        font.flavor = "woff2"
        font.save(output / f"BirLUGMono-{weight}.woff2")
        assert font["name"].getDebugName(1) == "BirLUG Mono"
    font = TTFont(args.originals / "Vazirmatn.woff2")
    font = instantiateVariableFont(font, {"wght": (400, 500)}, inplace=True)
    font.flavor = "woff2"
    font.save(output / "Vazirmatn.woff2")
    assert font["fvar"].axes[0].minValue == 400 and font["fvar"].axes[0].maxValue == 500
    print("Font optimization + naming/weight checks passed")

if __name__ == "__main__":
    main()
