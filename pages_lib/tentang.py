"""Tentang — penjelasan project dan metodologi."""
from __future__ import annotations

import streamlit as st


def render() -> None:
    st.markdown("### ℹ️ Tentang PanenCerdas")

    st.markdown(
        """
        **PanenCerdas** adalah platform prediksi hasil panen nasional yang mengintegrasikan
        citra satelit Sentinel-2 (gratis), data cuaca BMKG, dan data historis BPS dengan
        machine learning untuk memprediksi surplus / defisit pangan **per kecamatan, 3 bulan
        sebelum panen**.

        #### Masalah
        Pemerintah Indonesia masih mengumpulkan data produksi pertanian secara manual oleh
        penyuluh — lambat, tidak akurat, dan rawan manipulasi. Akibatnya keputusan impor /
        ekspor sering terlambat, dan petani tidak punya sinyal harga yang dapat diandalkan.

        #### Solusi
        - **Sentinel-2 NDVI time series** untuk memantau kesehatan tanaman per kecamatan
        - **Data cuaca** (curah hujan, suhu, kelembaban) sebagai prediktor stres tanaman
        - **Data BPS historis** sebagai ground truth untuk training model
        - **Model XGBoost** dengan time-based cross-validation
        - **Logika surplus / defisit** = produksi prediksi × luas panen − konsumsi

        #### Metodologi (MVP — Jawa Barat, Padi, 2024)
        1. Ekstraksi NDVI mean/max per kecamatan per bulan via Google Earth Engine
        2. Aggregasi data cuaca harian ke level bulanan
        3. Feature engineering: lag NDVI (T-3, T-2, T-1), curah hujan kumulatif, lag yield
        4. Training XGBoost dengan split berdasarkan tahun (no random split)
        5. Prediksi yield per kecamatan untuk musim tanam berikutnya
        6. Konversi ke surplus / defisit per kabupaten

        #### Roadmap Pengembangan
        - 🟢 Day 1: Foundation, scaffold, dummy demo
        - 🟡 Day 2: Pipeline data + model baseline
        - 🟡 Day 3: UI polish + surplus/defisit logic
        - 🟡 Day 4: Deploy + pitch

        #### Tim
        Lihat `CONTRIBUTING.md` untuk pembagian peran.

        #### Lisensi
        MIT (tentative — disesuaikan saat publish).
        """
    )
