"""PanenCerdas — Streamlit entry point.

Run: streamlit run app.py
"""
from __future__ import annotations

import streamlit as st
from streamlit_option_menu import option_menu

from pages_lib import dashboard, peta_prediksi, detail_kecamatan, tentang

st.set_page_config(
    page_title="PanenCerdas — Prediksi Hasil Panen Nasional",
    page_icon="🌾",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def inject_css() -> None:
    st.markdown(
        """
        <style>
        #MainMenu, footer, header { visibility: hidden; }
        .block-container { padding-top: 1rem; padding-bottom: 2rem; max-width: 1400px; }
        .metric-card {
            background: #FFFFFF;
            border: 1px solid #E3E8E4;
            border-radius: 12px;
            padding: 1.2rem 1.4rem;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .metric-card h3 { font-size: 0.85rem; color: #5A6B5F; margin: 0 0 0.4rem 0; font-weight: 500; }
        .metric-card .value { font-size: 1.9rem; font-weight: 700; color: #1B2A1F; }
        .metric-card .delta-pos { color: #2E7D32; font-size: 0.9rem; font-weight: 600; }
        .metric-card .delta-neg { color: #C62828; font-size: 0.9rem; font-weight: 600; }
        .hero {
            background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
            color: white;
            padding: 2rem 2.4rem;
            border-radius: 14px;
            margin-bottom: 1.5rem;
        }
        .hero h1 { color: white; font-size: 1.9rem; margin: 0 0 0.4rem 0; }
        .hero p { color: #DCEDC8; font-size: 1rem; margin: 0; opacity: 0.95; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_nav() -> str:
    return option_menu(
        menu_title=None,
        options=["Dashboard", "Peta Prediksi", "Detail Kecamatan", "Tentang"],
        icons=["speedometer2", "geo-alt-fill", "search", "info-circle"],
        default_index=0,
        orientation="horizontal",
        styles={
            "container": {"padding": "0.4rem 0", "background-color": "#F1F5F2", "border-radius": "10px"},
            "icon": {"color": "#2E7D32", "font-size": "1.1rem"},
            "nav-link": {
                "font-size": "0.95rem",
                "text-align": "center",
                "margin": "0 4px",
                "padding": "0.5rem 1rem",
                "color": "#1B2A1F",
                "--hover-color": "#E3F2E5",
            },
            "nav-link-selected": {"background-color": "#2E7D32", "color": "white", "font-weight": "600"},
        },
    )


def main() -> None:
    inject_css()
    selected = render_nav()

    if selected == "Dashboard":
        dashboard.render()
    elif selected == "Peta Prediksi":
        peta_prediksi.render()
    elif selected == "Detail Kecamatan":
        detail_kecamatan.render()
    elif selected == "Tentang":
        tentang.render()


if __name__ == "__main__":
    main()
