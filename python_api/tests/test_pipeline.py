from __future__ import annotations

import base64
import io
import os

import cv2
import numpy as np
import pytest
from PIL import Image

os.environ["PHYTO_DISABLE_REMBG"] = "1"

from python_api.pipeline import segment_leaf  # noqa: E402


def synthetic_leaf(
    background: tuple[int, int, int] = (245, 245, 245),
    *,
    hand: bool = False,
    hole: bool = True,
    marginal_bite: bool = True,
    chlorosis: bool = True,
    necrosis: bool = True,
    branch: bool = False,
) -> np.ndarray:
    height, width = 220, 260
    image = np.full((height, width, 3), background, dtype=np.uint8)
    if branch:
        cv2.line(image, (0, 108), (76, 104), (105, 61, 34), 7)
    cv2.ellipse(image, (130, 105), (62, 84), 0, 0, 360, (46, 174, 57), -1)
    cv2.rectangle(image, (125, 178), (135, 216), (68, 142, 42), -1)
    cv2.line(image, (130, 28), (130, 205), (174, 210, 78), 3)
    cv2.line(image, (130, 85), (88, 63), (142, 205, 75), 2)
    cv2.line(image, (130, 112), (174, 88), (142, 205, 75), 2)
    if chlorosis:
        cv2.circle(image, (102, 92), 14, (220, 205, 36), -1)
    if necrosis:
        cv2.circle(image, (150, 122), 11, (105, 55, 22), -1)
    if hole:
        cv2.circle(image, (130, 72), 8, background, -1)
    if marginal_bite:
        cv2.circle(image, (188, 108), 13, background, -1)
    if hand:
        cv2.rectangle(image, (95, 192), (170, 219), (205, 148, 112), -1)
        cv2.circle(image, (112, 190), 17, (205, 148, 112), -1)
    return image


def decode_data_url(data_url: str) -> np.ndarray:
    encoded = data_url.split(",", 1)[1]
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB"))


def test_masks_are_separate_and_defoliation_uses_expected_area() -> None:
    result = segment_leaf(synthetic_leaf())
    artifacts = result.artifacts
    metrics = result.response["metrics"]

    assert not np.any(artifacts.leaf_tissue_mask & artifacts.removed_area_mask)
    assert np.array_equal(
        artifacts.expected_leaf_mask,
        artifacts.leaf_tissue_mask | artifacts.removed_area_mask,
    )
    assert np.array_equal(
        artifacts.removed_area_mask,
        artifacts.internal_holes_mask | artifacts.marginal_loss_mask,
    )
    assert np.array_equal(artifacts.background_mask, ~artifacts.expected_leaf_mask)
    expected_percent = metrics["removedAreaPx"] / metrics["expectedLeafAreaPx"] * 100
    assert metrics["defoliationPercent"] == pytest.approx(expected_percent, abs=0.001)
    assert metrics["internalHoleAreaPx"] > 0
    assert result.response["pipelineVersion"] == "2.0.0-cielab-d65"


def test_white_background_is_composed_only_after_masks() -> None:
    result = segment_leaf(synthetic_leaf(background=(30, 35, 42)))
    white = decode_data_url(result.response["images"]["whiteBackground"])
    outside = ~result.artifacts.leaf_tissue_mask
    assert np.all(white[outside] == 255)
    assert np.any(white[result.artifacts.leaf_tissue_mask] != 255)


@pytest.mark.parametrize(
    "background",
    [(246, 246, 246), (14, 18, 22), (126, 82, 48), (25, 116, 48)],
    ids=["white", "dark", "soil", "green"],
)
def test_automatic_selection_on_varied_backgrounds(background: tuple[int, int, int]) -> None:
    result = segment_leaf(synthetic_leaf(background=background))
    metrics = result.response["metrics"]
    assert metrics["presentLeafAreaPx"] > 2_000
    assert metrics["presentLeafAreaPx"] < 35_000
    assert result.response["confidence"] > 0.2


def test_hand_connected_near_petiole_is_not_selected_as_leaf() -> None:
    result = segment_leaf(synthetic_leaf(hand=True))
    tissue = result.artifacts.leaf_tissue_mask
    assert not tissue[210, 105]
    assert tissue[183, 130]


def test_narrow_external_branch_is_not_counted_as_leaf_or_necrosis() -> None:
    result = segment_leaf(synthetic_leaf(branch=True))
    artifacts = result.artifacts
    assert not artifacts.leaf_tissue_mask[107, 20]
    assert not artifacts.necrosis_mask[107, 20]
    assert artifacts.leaf_tissue_mask[105, 130]


def test_tissue_classes_are_disjoint_and_inside_present_tissue() -> None:
    result = segment_leaf(synthetic_leaf())
    artifacts = result.artifacts
    classes = [
        artifacts.healthy_mask,
        artifacts.chlorosis_mask,
        artifacts.necrosis_mask,
        artifacts.uncertain_mask,
    ]
    class_sum = np.sum(np.stack(classes, axis=0), axis=0)
    assert np.all(class_sum <= 1)
    assert np.array_equal(class_sum.astype(bool), artifacts.leaf_tissue_mask)
    assert np.all(~artifacts.chlorosis_mask | artifacts.leaf_tissue_mask)
    assert np.all(~artifacts.necrosis_mask | artifacts.leaf_tissue_mask)


def test_cielab_detects_lesions_without_calling_the_main_vein_chlorosis() -> None:
    diseased = segment_leaf(synthetic_leaf()).response["metrics"]
    healthy = segment_leaf(
        synthetic_leaf(chlorosis=False, necrosis=False, hole=False, marginal_bite=False)
    ).response["metrics"]
    assert diseased["chlorosisPercent"] > 2
    assert diseased["necrosisPercent"] > 0.5
    assert healthy["chlorosisPercent"] < 1.5
    assert healthy["necrosisPercent"] < 0.5


def test_shadow_is_not_necrosis_and_reflection_is_not_chlorosis() -> None:
    image = synthetic_leaf(chlorosis=False, necrosis=False, hole=False, marginal_bite=False)
    cv2.ellipse(image, (112, 115), (34, 62), 0, 0, 360, (18, 45, 24), -1)
    cv2.circle(image, (158, 74), 11, (250, 250, 242), -1)
    artifacts = segment_leaf(image).artifacts
    assert not artifacts.necrosis_mask[115, 112]
    assert not artifacts.chlorosis_mask[74, 158]
