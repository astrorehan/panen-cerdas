"""Smoke tests — pastikan import dasar tidak rusak."""


def test_import_pipeline() -> None:
    from pipeline import sentinel, weather, bps, features  # noqa: F401


def test_import_model() -> None:
    from model import train, predict, evaluate  # noqa: F401


def test_import_utils() -> None:
    from utils import geo, viz  # noqa: F401


def test_status_pangan() -> None:
    from utils.viz import status_pangan

    assert status_pangan(15) == "surplus"
    assert status_pangan(5) == "cukup"
    assert status_pangan(-15) == "waspada"
    assert status_pangan(-25) == "defisit"


def test_normalize_name() -> None:
    from utils.geo import normalize_name

    assert normalize_name("Kab. Bandung") == "BANDUNG"
    assert normalize_name("KABUPATEN GARUT") == "GARUT"
    assert normalize_name("  Cikajang  ") == "CIKAJANG"
