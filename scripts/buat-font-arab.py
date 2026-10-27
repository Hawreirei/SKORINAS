"""Buat public/fonts/GenSoalArab.ttf: potongan Amiri (SIL OFL 1.1) untuk huruf Arab di PDF.

PDF menyambung huruf Arab sendiri ke bentuk sajian Unicode (src/ekspor/arab.ts), jadi font cukup memuat blok Arab,
bentuk sajian A dan B, serta huruf Latin dasar. Potongan diberi nama baru, sebagaimana lazim untuk font OFL yang diubah.

    pip install fonttools
    python3 scripts/buat-font-arab.py /usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont

RENTANG = [(0x20, 0x7E), (0xA0, 0xA0), (0xAB, 0xAB), (0xBB, 0xBB), (0x600, 0x6FF), (0xFB50, 0xFBFF), (0xFE70, 0xFEFF)]
NAMA = 'GenSoal Arab'


def main(sumber: str, tujuan: str = 'public/fonts/GenSoalArab.ttf') -> None:
    opsi = subset.Options()
    opsi.name_IDs = ['*']
    opsi.layout_features = []
    opsi.hinting = False
    opsi.notdef_outline = True
    font = TTFont(sumber)
    ada = font.getBestCmap()
    kode = [c for a, b in RENTANG for c in range(a, b + 1) if c in ada]
    pemotong = subset.Subsetter(opsi)
    pemotong.populate(unicodes=kode)
    pemotong.subset(font)
    nama = font['name']
    for rec in list(nama.names):
        if rec.nameID in (1, 4, 16):
            nama.setName(NAMA, rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID == 6:
            nama.setName('GenSoalArab', rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID == 3:
            nama.setName('GenSoalArab-Regular', rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID not in (0, 5, 7, 11, 13, 14):
            nama.removeNames(nameID=rec.nameID)
    font.save(tujuan)
    print(f'{len(kode)} karakter')


if __name__ == '__main__':
    main(*sys.argv[1:])
