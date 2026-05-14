"""Smoke tests — pastikan import dasar tidak rusak."""

import sys
from pathlib import Path

ML_SERVICE = Path(__file__).resolve().parent.parent / "ml_service"
if str(ML_SERVICE) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE))


def test_import_pipeline() -> None:
    from pipeline import sentinel, weather, bps, features  # noqa: F401


def test_import_ml_service_model() -> None:
    import model

    assert hasattr(model, "train_and_save")
    assert hasattr(model, "load_models")
    assert hasattr(model, "predict")
    assert hasattr(model, "CROP_TYPES")
    assert "padi" in model.CROP_TYPES


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
