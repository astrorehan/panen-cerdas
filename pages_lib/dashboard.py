"""Dashboard — overview KPI + ringkasan provinsi."""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st


def _kpi_card(label: str, value: str, delta: str | None = None, positive: bool = True) -> str:
    delta_html = ""
    if delta:
        cls = "delta-pos" if positive else "delta-neg"
        delta_html = f'<div class="{cls}">{delta}</div>'
    return f"""
    <div class="metric-card">
        <h3>{label}</h3>
        <div class="value">{value}</div>
        {delta_html}
    </div>
    """


def render() -> None:
    st.markdown(
        """
        <div class="hero">
            <h1>🌾 PanenCerdas Dashboard</h1>
            <p>Prediksi hasil panen padi Jawa Barat — musim tanam 2024 (data dummy, Day 1)</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(_kpi_card("Prediksi Produksi", "1.42 jt ton", "+3.1% vs 2023", True), unsafe_allow_html=True)
    with c2:
        st.markdown(_kpi_card("Status Pangan", "SURPLUS", "+182 rb ton", True), unsafe_allow_html=True)
    with c3:
        st.markdown(_kpi_card("Kecamatan Defisit", "12 / 627", "-4 vs 2023", True), unsafe_allow_html=True)
    with c4:
        st.markdown(_kpi_card("Akurasi Model", "MAPE 13.4%", "Backtested 2023", True), unsafe_allow_html=True)

    st.markdown("&nbsp;")

    col_a, col_b = st.columns([3, 2])

    with col_a:
        st.subheader("Tren Produksi Padi Jabar")
        df = pd.DataFrame(
            {
                "Tahun": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                "Produksi (juta ton)": [1.30, 1.32, 1.35, 1.33, 1.38, 1.37, 1.42],
                "Tipe": ["Aktual"] * 6 + ["Prediksi"],
            }
        )
        fig = px.line(df, x="Tahun", y="Produksi (juta ton)", color="Tipe", markers=True,
                      color_discrete_map={"Aktual": "#2E7D32", "Prediksi": "#FF9800"})
        fig.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=10), plot_bgcolor="white")
        st.plotly_chart(fig, use_container_width=True)

    with col_b:
        st.subheader("Top Kecamatan Penyumbang")
        df2 = pd.DataFrame(
            {
                "Kecamatan": ["Cikajang", "Pamarican", "Cisaat", "Cikoneng", "Banjarsari"],
                "Produksi (rb ton)": [42, 38, 35, 31, 28],
            }
        )
        fig2 = px.bar(df2, x="Produksi (rb ton)", y="Kecamatan", orientation="h", color_discrete_sequence=["#2E7D32"])
        fig2.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=10), plot_bgcolor="white", yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig2, use_container_width=True)

    st.info(
        "📌 **Day 1:** Halaman ini masih pakai data dummy. "
        "Replace dengan output `model/predict.py` setelah Day 2.",
        icon="💡",
    )
