"""Buat public/fonts/GenSoalSimbol.ttf: potongan DejaVu Sans berisi simbol matematika yang tidak ada di Liberation Serif.

PDF memakai Liberation Serif untuk huruf; simbol seperti ∀ ⊆ ⇒ ℝ ⌊ ⌋ diambil dari font ini. Lisensi DejaVu
(Bitstream Vera) mewajibkan font turunan diberi nama tanpa "Bitstream", "Vera", "Arev", atau "Tavmjong Bah".

    pip install fonttools
    python3 scripts/buat-font-simbol.py /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf

Setelah menambah karakter, salin daftar yang dicetak ke KARAKTER_SIMBOL di src/ekspor/pdf-tata.ts.
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont

KARAKTER = (
    'ℂℍℑℕℙℚℜℝℤℵ↗↘↦⇌⇐⇒∀∁∃∄∅∇∈∉∋∌∐∓∖∗∘∝∠∡∣∤∥∧∨∪∬∭∮∴∵∼∽≃≅≌≐≪≫≮≯≰≱'
    '⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊕⊗⊤⊥⋂⋃⋄⋆⋍⋮⋯⋰⋱⌈⌉⌊⌋△◠☐✓⟨⟩⟵⟶⟹⟺'
)
NAMA = 'GenSoal Simbol'


def main(sumber: str, tujuan: str = 'public/fonts/GenSoalSimbol.ttf') -> None:
    opsi = subset.Options()
    opsi.name_IDs = ['*']
    opsi.layout_features = []
    opsi.hinting = False
    opsi.notdef_outline = True
    font = TTFont(sumber)
    pemotong = subset.Subsetter(opsi)
    pemotong.populate(unicodes=[ord(c) for c in KARAKTER])
    pemotong.subset(font)
    nama = font['name']
    for rec in list(nama.names):
        if rec.nameID in (1, 4, 16):
            nama.setName(NAMA, rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID == 6:
            nama.setName('GenSoalSimbol', rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID == 3:
            nama.setName('GenSoalSimbol-Regular', rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID not in (0, 5, 7, 13, 14):
            nama.removeNames(nameID=rec.nameID)
    font.save(tujuan)
    ada = ''.join(sorted(chr(c) for c in TTFont(tujuan).getBestCmap() if c > 0x7F))
    hilang = ''.join(c for c in KARAKTER if c not in ada)
    if hilang:
        sys.exit(f'Tidak ada di font sumber: {hilang}')
    print(ada)


if __name__ == '__main__':
    main(*sys.argv[1:])
