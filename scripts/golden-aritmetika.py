"""Membangkitkan butir acuan aritmetika deterministik untuk golden set.
Jalankan: python3 scripts/golden-aritmetika.py > data/golden/matematika-aritmetika.json
Kunci dihitung dengan Fraction, pengecoh dari kesalahan konsep yang umum."""
import json, random
from fractions import Fraction as F

acak = random.Random(20261024)

def fr(x: F) -> str:
    if x.denominator == 1:
        return f"${x.numerator}$"
    return f"$\\frac{{{x.numerator}}}{{{x.denominator}}}$"

terpakai = set()

def pg(id_, kelas, pokok, kunci, pengecoh, ekspresi, nilai, pembahasan, fmt=str):
    nilai_semua = [kunci] + pengecoh
    if len(set(nilai_semua)) != 4 or pokok in terpakai:
        return None
    terpakai.add(pokok)
    huruf = "ABCD"
    urutan = nilai_semua[:]
    acak.shuffle(urutan)
    opsi = {huruf[i]: fmt(v) for i, v in enumerate(urutan)}
    k = huruf[urutan.index(kunci)]
    return {"id": id_, "kelas": kelas, "harapan": "terverifikasi_hitung", "isi": {
        "bentuk": "pilihan_ganda", "pokok": pokok, "opsi": opsi, "kunci": k,
        "pembahasan": pembahasan, "verifikasi": {"tipe": "ekspresi", "ekspresi": ekspresi, "nilai": nilai}, "gambar": None}}

hasil = []
n = 0
while len([h for h in hasil if h["id"].startswith("G-J")]) < 15:
    a, b = acak.randint(12, 89), acak.randint(11, 79)
    item = pg(f"G-J{n:02d}", 2, f"Hasil dari ${a} + {b}$ adalah ....", a + b, [a + b + 10, a + b - 1, abs(a - b)], f"{a} + {b}", str(a + b), [f"{a} + {b} = {a + b}"])
    n += 1
    if item: hasil.append(item)
n = 0
while len([h for h in hasil if h["id"].startswith("G-K")]) < 15:
    a, b = acak.randint(3, 9), acak.randint(4, 12)
    item = pg(f"G-K{n:02d}", 3, f"Hasil dari ${a} \\times {b}$ adalah ....", a * b, [a + b, a * b + a, a * (b - 1)], f"{a} * {b}", str(a * b), [f"{a} × {b} = {a * b}"])
    n += 1
    if item: hasil.append(item)
n = 0
while len([h for h in hasil if h["id"].startswith("G-P")]) < 15:
    d = acak.choice([5, 7, 9, 11, 12])
    a, b = acak.randint(1, d - 2), acak.randint(1, d - 2)
    if a + b >= d: continue
    k = F(a + b, d)
    if k.denominator != d: continue
    teks = lambda p, q: f"$\\frac{{{p}}}{{{q}}}$"
    item = pg(f"G-P{n:02d}", 4, f"Hasil dari {teks(a, d)} + {teks(b, d)} adalah ....", k,
              [F(a + b, 2 * d), F(a * b, d), k + F(1, d)], f"{a}/{d} + {b}/{d}",
              f"{a + b}/{d}", [f"Penyebut sama, jumlahkan pembilangnya: {a} + {b} = {a + b}."], fmt=fr)
    n += 1
    if item: hasil.append(item)
n = 0
while len([h for h in hasil if h["id"].startswith("G-R")]) < 15:
    p = acak.choice([10, 20, 25, 40, 50, 75])
    N = acak.choice([40, 60, 80, 120, 200, 240, 400])
    k = N * p // 100
    if N * p % 100: continue
    item = pg(f"G-R{n:02d}", 6, f"Nilai dari {p}% dari {N} adalah ....", k, [N - k if N - k != k else k + 10, p, k * 2], f"{p}% * {N}", str(k),
              [f"{p}% × {N} = {k}"])
    n += 1
    if item: hasil.append(item)

print(json.dumps({"keterangan": "Dibangkitkan oleh scripts/golden-aritmetika.py; kunci dihitung dengan Fraction.", "benar": hasil, "salah": []}, ensure_ascii=False, indent=1))
