"""
load_bps_produksi.py
--------------------
Loader data produksi per kabupaten/kota dari BPS WebAPI (SIMDASI) ke tabel
Supabase `kabupaten_produksi`. Dipakai untuk migrasi level kabupaten (baseline,
produksi, status pangan per kab/kota).

DUA MODE:

1) FILE  -> parse file JSON yang sudah diunduh dari browser (boleh berisi
   beberapa objek JSON digabung + komentar // ala respons yang dipaste).
       python scripts/load_bps_produksi.py --files input.json --crop padi

2) FETCH -> tarik langsung dari API BPS. JALANKAN DI MESIN ANDA (bukan server
   yang IP-nya diblok WAF BPS). Butuh token WebAPI (env BPS_WEBAPI_TOKEN atau --token).
       python scripts/load_bps_produksi.py --fetch --crop padi \
           --years 2020 2021 2022 2023 2024 2025 \
           --wilayah 3400000 --id-tabel ZjZ6MXlacGJNR0JaaHBPRSs0TzNUdz09

Kolom dideteksi dari `nama_variabel` ("Luas Panen" / "Produktivitas" / "Produksi"),
jadi commodity-agnostic: untuk jagung/kedelai/dll cukup ganti --crop + --id-tabel
(id_tabel beda per komoditas; cari di portal SIMDASI BPS).

yield_ton_per_ha dihitung = produksi_ton / luas_panen_ha (fallback produktivitas/10).
Baris total provinsi (kode_wilayah pola 34_00000) otomatis dilewati.

Atribusi: data bersumber dari API Badan Pusat Statistik (BPS).
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# pastikan import database (engine Supabase) jalan dari folder ml_service
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402
from database import engine  # noqa: E402

BASE_URL = "https://webapi.bps.go.id/v1/api/interoperabilitas/datasource/simdasi"

# id_tabel SIMDASI per komoditas (isi saat ketemu di portal BPS).
CROP_TABEL = {
    "padi": "ZjZ6MXlacGJNR0JaaHBPRSs0TzNUdz09",
    # "jagung": "...",
    # "kedelai": "...",
}


def _parse_num(s):
    """'18.836,00' -> 18836.0 ; '56,42' -> 56.42 ; '-'/'...'/'' -> None."""
    if s is None:
        return None
    s = str(s).strip()
    if not s or s in ("-", "...", "NA", "–"):
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _iter_json_objects(raw: str):
    """Yield setiap objek JSON dalam teks (boleh banyak objek + komentar //)."""
    # buang komentar // (baris) — aman karena value tidak mengandung //
    cleaned = re.sub(r"//[^\n\r]*", "", raw)
    dec = json.JSONDecoder()
    i, n = 0, len(cleaned)
    while i < n:
        while i < n and cleaned[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        obj, end = dec.raw_decode(cleaned, i)
        yield obj
        i = end


def _detect_columns(kolom: dict) -> dict:
    """Map peran -> id kolom berdasar nama_variabel (commodity-agnostic)."""
    roles = {}
    for col_id, meta in kolom.items():
        nama = (meta.get("nama_variabel") or "").lower()
        if "luas panen" in nama:
            roles["luas"] = col_id
        elif "produktivitas" in nama:
            roles["produktivitas"] = col_id
        elif "produksi" in nama:
            roles["produksi"] = col_id
    return roles


def _rows_from_response(obj: dict, crop: str):
    """Ekstrak baris (kode4, tahun, luas, produksi, yield) dari 1 respons SIMDASI."""
    blocks = [b for b in obj.get("data", []) if isinstance(b, dict) and "data" in b]
    out = []
    for blk in blocks:
        tahun = blk.get("tahun_data")
        cols = _detect_columns(blk.get("kolom", {}))
        if "luas" not in cols or "produksi" not in cols:
            print(f"  [skip] blok tanpa kolom luas/produksi (tahun={tahun})")
            continue
        for row in blk.get("data", []):
            kode = str(row.get("kode_wilayah", ""))
            if len(kode) < 4 or kode[2:4] == "00":  # 34_00000 = total provinsi
                continue
            kode4 = kode[:4]
            var = row.get("variables", {})

            def val(role):
                cid = cols.get(role)
                if not cid:
                    return None
                return _parse_num(var.get(cid, {}).get("value_raw") or var.get(cid, {}).get("value"))

            luas = val("luas")
            produksi = val("produksi")
            prod_tas = val("produktivitas")
            if luas and produksi:
                ytph = round(produksi / luas, 2)
            elif prod_tas is not None:
                ytph = round(prod_tas / 10.0, 2)  # ku/ha -> ton/ha
            else:
                ytph = None
            if luas is None and produksi is None:
                continue
            out.append({
                "kode": kode4, "crop": crop, "tahun": int(tahun),
                "luas": luas, "produksi": produksi, "yield": ytph,
            })
    return out


def _fetch(token, crop, years, wilayah, id_tabel, ds_id):
    import httpx
    id_tabel = id_tabel or CROP_TABEL.get(crop)
    if not id_tabel:
        sys.exit(f"id_tabel untuk '{crop}' tidak diketahui. Beri --id-tabel.")
    objs = []
    for y in years:
        url = f"{BASE_URL}/id/{ds_id}/tahun/{y}/id_tabel/{id_tabel}/wilayah/{wilayah}/key/{token}"
        print(f"  GET tahun {y} wilayah {wilayah} ...")
        r = httpx.get(url, timeout=60)
        r.raise_for_status()
        objs.append(r.json())
    return objs


def main():
    ap = argparse.ArgumentParser(description="Load BPS SIMDASI -> kabupaten_produksi")
    ap.add_argument("--crop", default="padi")
    ap.add_argument("--files", nargs="*", help="file JSON hasil unduh (mode file)")
    ap.add_argument("--fetch", action="store_true", help="tarik langsung dari API BPS")
    ap.add_argument("--years", nargs="*", type=int, help="tahun (mode fetch)")
    ap.add_argument("--wilayah", default="3400000", help="kode wilayah (prov+0000), mode fetch")
    ap.add_argument("--id-tabel", dest="id_tabel", help="id_tabel SIMDASI (per komoditas)")
    ap.add_argument("--ds-id", default="25", help="datasource id SIMDASI (default 25)")
    ap.add_argument("--token", default=os.getenv("BPS_WEBAPI_TOKEN"), help="token WebAPI BPS")
    ap.add_argument("--dry-run", action="store_true", help="parse saja, tidak menulis DB")
    args = ap.parse_args()

    objs = []
    if args.fetch:
        if not args.token:
            sys.exit("Mode fetch butuh --token atau env BPS_WEBAPI_TOKEN.")
        if not args.years:
            sys.exit("Mode fetch butuh --years (mis. --years 2022 2023).")
        objs = _fetch(args.token, args.crop, args.years, args.wilayah, args.id_tabel, args.ds_id)
    elif args.files:
        for fp in args.files:
            raw = Path(fp).read_text(encoding="utf-8")
            objs.extend(_iter_json_objects(raw))
    else:
        sys.exit("Pilih salah satu: --files <json...> ATAU --fetch.")

    rows = []
    for obj in objs:
        rows.extend(_rows_from_response(obj, args.crop))

    if not rows:
        sys.exit("Tidak ada baris kabupaten yang ter-parse.")

    print(f"\nTer-parse {len(rows)} baris ({args.crop}):")
    for r in sorted(rows, key=lambda x: (x["tahun"], x["kode"])):
        print(f"  {r['tahun']} {r['kode']}  luas={r['luas']}  produksi={r['produksi']}  yield={r['yield']}")

    if args.dry_run:
        print("\n[dry-run] tidak menulis DB.")
        return

    sql = text(
        "INSERT INTO public.kabupaten_produksi "
        "(kode_kabupaten, crop_type, tahun, luas_panen_ha, produksi_ton, yield_ton_per_ha, source) "
        "VALUES (:kode, :crop, :tahun, :luas, :produksi, :yield, 'bps_simdasi') "
        "ON CONFLICT (kode_kabupaten, crop_type, tahun) DO UPDATE SET "
        "luas_panen_ha=EXCLUDED.luas_panen_ha, produksi_ton=EXCLUDED.produksi_ton, "
        "yield_ton_per_ha=EXCLUDED.yield_ton_per_ha, source=EXCLUDED.source"
    )
    written = 0
    with engine.begin() as c:
        for r in rows:
            try:
                c.execute(sql, r)
                written += 1
            except Exception as e:
                print(f"  [gagal] {r['tahun']} {r['kode']}: {e}")
    print(f"\nOK: {written}/{len(rows)} baris di-upsert ke kabupaten_produksi.")


if __name__ == "__main__":
    main()
