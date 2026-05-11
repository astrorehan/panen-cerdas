"""Peta prediksi — choropleth surplus/defisit per kecamatan."""
from __future__ import annotations

import folium
import streamlit as st
from streamlit_folium import st_folium


def render() -> None:
    st.markdown("### 🗺️ Peta Prediksi Surplus / Defisit per Kecamatan")
    st.caption("Pilih provinsi, komoditas, dan periode. Klik kecamatan untuk drill-down.")

    c1, c2, c3, c4 = st.columns([2, 2, 2, 1])
    with c1:
        st.selectbox("Provinsi", ["Jawa Barat"], key="prov")
    with c2:
        st.selectbox("Komoditas", ["Padi"], key="komoditas")
    with c3:
        st.selectbox("Musim Tanam", ["MT 2024-1", "MT 2024-2", "MT 2025-1"], key="musim")
    with c4:
        st.markdown("<br>", unsafe_allow_html=True)
        st.button("🔄 Refresh", use_container_width=True)

    m = folium.Map(location=[-6.9147, 107.6098], zoom_start=8, tiles="CartoDB positron")

    folium.GeoJson(
        data={
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Kab. Bandung (dummy)"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [107.5, -7.05], [107.8, -7.05],
                            [107.8, -6.85], [107.5, -6.85], [107.5, -7.05],
                        ]],
                    },
                }
            ],
        },
        style_function=lambda _: {"fillColor": "#2E7D32", "color": "#1B5E20", "fillOpacity": 0.5, "weight": 1.5},
        tooltip=folium.GeoJsonTooltip(fields=["name"], aliases=["Wilayah:"]),
    ).add_to(m)

    legend_html = """
    <div style="position: fixed; bottom: 30px; left: 30px; z-index: 1000;
                background: white; padding: 12px 16px; border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 0.85rem;">
        <strong style="font-size: 0.9rem;">Status Pangan</strong><br>
        <div style="margin-top: 6px;">
            <span style="display:inline-block;width:14px;height:14px;background:#2E7D32;border-radius:3px;margin-right:6px;"></span> Surplus (&gt; +10%)<br>
            <span style="display:inline-block;width:14px;height:14px;background:#A5D6A7;border-radius:3px;margin-right:6px;"></span> Cukup<br>
            <span style="display:inline-block;width:14px;height:14px;background:#FFB74D;border-radius:3px;margin-right:6px;"></span> Waspada<br>
            <span style="display:inline-block;width:14px;height:14px;background:#C62828;border-radius:3px;margin-right:6px;"></span> Defisit (&lt; -10%)
        </div>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    st_folium(m, use_container_width=True, height=540, returned_objects=[])

    st.info(
        "📌 **Day 1:** Peta masih polygon dummy. Day 3: load shapefile asli "
        "dari `data/shapefiles/`, warnai berdasarkan output `model/predict.py`.",
        icon="💡",
    )
