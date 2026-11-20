# Self-hosted fonts

Vazirmatn by Vazirmatn Project Authors; Source Code Pro by Adobe, both SIL OFL.
Licenses accompany fonts here. No Google Fonts requests.

- Vazirmatn: upstream variable WOFF2, restricted to weights 400–500 without changing glyph coverage.
- BirLUG Mono: Latin subset of Source Code Pro Regular/Medium. Renamed because Adobe reserves 'Source'.
- Font shaping/features retained; Persian body uses Vazirmatn, never Latin subset.

Originals retained privately in ../birlug-media/originals/fonts/. Upstream sources:
https://github.com/rastikerdar/vazirmatn/tree/master/fonts/webfonts
https://github.com/adobe-fonts/source-code-pro/tree/release/WOFF2/OTF

Optional regeneration (NOT required for normal website build):
```sh
python -m pip install fonttools==4.66.1 brotli==1.2.0
python tools/fonts.py ../birlug-media/originals/fonts
```
