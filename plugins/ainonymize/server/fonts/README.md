# Bundled fallback fonts (PDF redraw)

Used lazily by `core/pdf.js` (`FONT_CHAIN`) when a redrawn PDF line holds a glyph Liberation Sans
lacks: Vietnamese, superscripts/subscripts, Greek/Cyrillic gaps, Arabic, Hebrew. First font in the
chain that has the glyph draws it; nothing no font covers is ever folded or drawn as "?" - the
fidelity gate refuses instead.

All fonts: SIL Open Font License 1.1 (see `OFL.txt`), (c) The Noto Project Authors.

Source (exact pins, static TTFs from the Google Fonts releases of the Noto project):

| File | Source package (npm) | Tarball SHA-256 |
|---|---|---|
| NotoSans-Regular/Bold.ttf | `@expo-google-fonts/noto-sans@0.4.2` (notofonts/latin-greek-cyrillic) | 98cf14a19b8e67a0e76bfd4d5df98937b9734e6dde570bd750f2259042042548 |
| NotoSansArabic-Regular/Bold.ttf | `@expo-google-fonts/noto-sans-arabic@0.4.3` (notofonts/arabic) | 29e966f9d48a4ce7dd3c2c4c016f29cd888089538217303fb2c87de9e7f048ed |
| NotoSansHebrew-Regular/Bold.ttf | `@expo-google-fonts/noto-sans-hebrew@0.4.1` (notofonts/hebrew) | f82f8e852e3355521c511f2762a0130216d208d108bf4739aa977eb6a6d3012c |

Subset with fonttools `pyftsubset` (`--no-hinting`, no `kern`), from the 400Regular and 700Bold files:

- Noto Sans: U+0020-007E, 00A0-024F, 02B0-02FF, 0300-036F, 0370-03FF, 0400-04FF, 1E00-1EFF,
  2000-218F (punctuation, super/subscripts, currency, letterlike, number forms), 2190-22FF, 25A0-25FF;
  features `mark,mkmk,locl`.
- Noto Sans Arabic: U+0020-0040, 00A0, 0600-06FF, 0750-077F, 08A0-08FF, 200C-200F, 2010-2015,
  2018-201D, 25CC, FB50-FDFF, FE70-FEFF; all layout features.
- Noto Sans Hebrew: U+0020-007E, 0590-05FF, FB1D-FB4F, 200C-200F; all layout features.

Constraint: fontkit 1.1.1 (via pdf-lib) mis-subsets TrueType fonts whose `loca` table is the long
format (glyphs vanish in the output PDF). Every file here must keep `head.indexToLocFormat == 0`, i.e.
`glyf` < 128 KB - `test/pdf_font_fallback_test.mjs` enforces it. Italic faces are not shipped:
an italic line draws its missing glyphs upright.

Build: `build.mjs` copies this directory to `dist/review/fonts/` (next to the PDF chunk, like
`standard_fonts/`); the files are fetched only when a line needs them.
