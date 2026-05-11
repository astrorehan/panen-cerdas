"""Visualization helpers — color scales, choropleth styling."""
from __future__ import annotations

SURPLUS_COLORSCALE = {
    "surplus": "#2E7D32",
    "cukup": "#A5D6A7",
    "waspada": "#FFB74D",
    "defisit": "#C62828",
}


def status_pangan(surplus_pct: float) -> str:
    """Klasifikasi status pangan dari persen surplus.

    >  +10% → SURPLUS
    -10..+10 → CUKUP
    -20..-10 → WASPADA
    < -20%  → DEFISIT
    """
    if surplus_pct > 10:
        return "surplus"
    if surplus_pct > -10:
        return "cukup"
    if surplus_pct > -20:
        return "waspada"
    return "defisit"


def color_for_status(status: str) -> str:
    return SURPLUS_COLORSCALE.get(status, "#BDBDBD")
