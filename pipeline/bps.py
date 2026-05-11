"""Parsing data BPS produksi padi historis.

Sumber:
- bps.go.id → Statistik Pertanian → Produksi Padi per Kabupaten / Kecamatan
- File biasanya .xlsx dengan multi-header, merged cells, footnote di bawah

Output (target):
    columns = [kabupaten, kecamatan, tahun, luas_panen_ha, produksi_ton, yield_ton_per_ha]
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pandas as pd


def parse_bps_excel(path: str | Path) -> "pd.DataFrame":
    """Parse satu file Excel BPS jadi long-format DataFrame.

    Tips parsing Excel BPS yang berantakan:
    - `pd.read_excel(path, header=[2, 3])` untuk multi-header
    - Drop baris footnote: filter dropna pada kolom kabupaten
    - Bersihkan nama kabupaten: hapus "Kab.", trim spasi, uppercase untuk join
    - Konversi tipe data: kadang ada karakter "*" atau "-" di angka
    """
    raise NotImplementedError("TODO Day 2: implementasi parsing Excel BPS")


def standardize_names(df: "pd.DataFrame", col: str = "kabupaten") -> "pd.DataFrame":
    """Normalisasi nama wilayah untuk konsistensi join dengan shapefile.

    Common mismatches:
    - "Kab. Bandung" vs "BANDUNG" vs "Kabupaten Bandung"
    - "Kab. Bandung Barat" vs "BANDUNG BARAT"
    - typo, ejaan lama vs baru
    """
    raise NotImplementedError("TODO Day 2: mapping + cleaning nama")


def load_all_bps(raw_dir: str | Path) -> "pd.DataFrame":
    """Load semua file BPS di direktori, concat jadi satu DataFrame panjang."""
    raise NotImplementedError("TODO Day 2")
