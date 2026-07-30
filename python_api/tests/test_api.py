from __future__ import annotations

import io
import os

from fastapi.testclient import TestClient
from PIL import Image

os.environ["PHYTO_DISABLE_REMBG"] = "1"

from python_api.main import app  # noqa: E402
from python_api.tests.test_pipeline import synthetic_leaf  # noqa: E402


client = TestClient(app)


def image_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(synthetic_leaf()).save(buffer, format="PNG")
    return buffer.getvalue()


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_segment_leaf_contract() -> None:
    response = client.post(
        "/api/segment-leaf",
        files={"image": ("leaf.png", image_bytes(), "image/png")},
        data={"sensitivity": "automatico"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert 0 <= body["confidence"] <= 1
    assert set(body["metrics"]) == {
        "expectedLeafAreaPx",
        "presentLeafAreaPx",
        "internalHoleAreaPx",
        "marginalLossAreaPx",
        "removedAreaPx",
        "defoliationPercent",
        "healthyPercent",
        "chlorosisPercent",
        "necrosisPercent",
    }
    assert set(("whiteBackground", "overlay", "leafMask", "expectedLeafMask", "removedAreaMask")) <= set(body["images"])
    assert all(body["images"][key].startswith("data:image/png;base64,") for key in body["images"])
    assert isinstance(body["warnings"], list)


def test_rejects_non_image_upload() -> None:
    response = client.post(
        "/api/segment-leaf",
        files={"image": ("leaf.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 415
