"""Section modules for the PanenCerdas Streamlit app.

Named ``pages_lib`` (not ``pages``) so Streamlit does not auto-register
these as separate pages — we use a custom nav in app.py.
"""
from . import dashboard, peta_prediksi, detail_kecamatan, tentang

__all__ = ["dashboard", "peta_prediksi", "detail_kecamatan", "tentang"]
