"""Detail kecamatan — drill-down time series NDVI + prediksi vs aktual."""
from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st


def render() -> None:
    st.markdown("### 🔍 Detail Kecamatan")
    c1, c2 = st.columns([2, 1])
    with c1:
        st.selectbox(
            "Pilih Kecamatan",
            ["Cikajang (Kab. Garut)", "Pamarican (Kab. Ciamis)", "Cisaat (Kab. Sukabumi)"],
            key="kec",
        )
    with c2:
        st.selectbox("Komoditas", ["Padi"], key="kom_detail")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Prediksi Yield", "5.8 ton/ha", "+0.3 vs rata-rata")
    with c2:
        st.metric("Luas Panen", "2,140 ha", "stabil")
    with c3:
        st.metric("Total Produksi", "12,412 ton", "+5.1% vs 2023")

    st.markdown("#### Time series NDVI vs Yield Historis")
    months = pd.date_range("2018-01", "2024-12", freq="MS")
    rng = np.random.default_rng(42)
    ndvi = 0.55 + 0.2 * np.sin(np.arange(len(months)) * np.pi / 6) + rng.normal(0, 0.03, len(months))
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=months, y=ndvi, mode="lines", name="NDVI", line=dict(color="#2E7D32", width=2)))
    fig.add_vline(x="2024-01-01", line=dict(color="#FF9800", dash="dash"), annotation_text="Mulai Prediksi")
    fig.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10), plot_bgcolor="white",
                      yaxis_title="NDVI", xaxis_title=None)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("#### Prediksi vs Aktual (Backtest)")
    years = list(range(2018, 2025))
    actual = [5.2, 5.3, 5.4, 5.3, 5.5, 5.5, None]
    pred = [None, None, None, None, None, 5.6, 5.8]
    df = pd.DataFrame({"Tahun": years, "Aktual": actual, "Prediksi": pred})
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(x=df["Tahun"], y=df["Aktual"], mode="lines+markers", name="Aktual (BPS)",
                              line=dict(color="#2E7D32", width=3)))
    fig2.add_trace(go.Scatter(x=df["Tahun"], y=df["Prediksi"], mode="lines+markers", name="Prediksi Model",
                              line=dict(color="#FF9800", width=3, dash="dash")))
    fig2.update_layout(height=320, margin=dict(l=10, r=10, t=20, b=10), plot_bgcolor="white",
                       yaxis_title="Yield (ton/ha)")
    st.plotly_chart(fig2, use_container_width=True)

    st.info(
        "📌 **Day 1:** Semua angka di sini dummy. Day 3: bind ke output "
        "`model/predict.py` dan `pipeline/features.py`.",
        icon="💡",
    )
