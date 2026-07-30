from __future__ import annotations

import argparse
import base64
import io
import json
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

from python_api.pipeline import PipelineResult, decode_image, segment_leaf


def _base_leaf(
    background: tuple[int, int, int],
    *,
    hand: bool = False,
    chlorosis: bool = False,
    necrosis: bool = False,
    holes: int = 0,
    bites: int = 0,
    petiole: bool = True,
) -> np.ndarray:
    height, width = 300, 360
    image = np.full((height, width, 3), background, dtype=np.uint8)
    cv2.ellipse(image, (180, 142), (84, 112), 0, 0, 360, (48, 171, 58), -1)
    if petiole:
        cv2.rectangle(image, (174, 244), (186, 294), (68, 142, 42), -1)
    cv2.line(image, (180, 32), (180, 282), (175, 211, 80), 4)
    for y, direction in ((90, -1), (126, 1), (164, -1), (202, 1)):
        cv2.line(image, (180, y), (180 + direction * 62, y - 26), (140, 202, 74), 2)
    if chlorosis:
        cv2.circle(image, (144, 126), 24, (222, 204, 38), -1)
        cv2.circle(image, (208, 176), 17, (202, 185, 28), -1)
    if necrosis:
        cv2.circle(image, (210, 112), 19, (104, 54, 20), -1)
        cv2.circle(image, (155, 188), 14, (116, 61, 24), -1)
    for index in range(holes):
        cv2.circle(image, (160 + index * 34, 105 + index * 35), 8 + index * 2, background, -1)
    for index in range(bites):
        cv2.circle(image, (260 - index * 12, 105 + index * 40), 14 + index * 3, background, -1)
    if hand:
        cv2.rectangle(image, (125, 270), (236, 299), (207, 150, 113), -1)
        cv2.circle(image, (150, 267), 24, (207, 150, 113), -1)
    return image


def synthetic_cases() -> dict[str, np.ndarray]:
    vegetation = _base_leaf((35, 118, 51))
    for center in ((28, 35), (320, 45), (42, 210), (322, 225)):
        cv2.circle(vegetation, center, 24, (45, 156, 58), -1)
        cv2.line(vegetation, center, (center[0] + 18, center[1] + 35), (75, 115, 42), 4)
    shadows = _base_leaf((245, 245, 245), chlorosis=True, necrosis=True)
    cv2.ellipse(shadows, (155, 150), (55, 105), 0, 0, 360, (18, 45, 24), -1)
    cv2.circle(shadows, (205, 88), 17, (250, 250, 242), -1)
    partial = _base_leaf((245, 245, 245), holes=3, bites=3, chlorosis=True)
    standard = _base_leaf((245, 245, 245), holes=1, bites=1, chlorosis=True, necrosis=True)
    return {
        "01_hand": _base_leaf((245, 245, 245), hand=True, holes=1),
        "02_green_background": _base_leaf((24, 112, 46), holes=1),
        "03_vegetation_background": vegetation,
        "04_soil": _base_leaf((126, 82, 48), holes=1),
        "05_white": standard,
        "06_dark": _base_leaf((13, 18, 22), holes=1, bites=1),
        "07_chlorotic": _base_leaf((245, 245, 245), chlorosis=True),
        "08_necrotic": _base_leaf((245, 245, 245), necrosis=True),
        "09_internal_holes": _base_leaf((245, 245, 245), holes=3),
        "10_marginal_bites": _base_leaf((245, 245, 245), bites=3),
        "11_partially_destroyed": partial,
        "12_petiole": _base_leaf((245, 245, 245), petiole=True),
        "13_shadows_reflections": shadows,
        "14_low_resolution": cv2.resize(standard, (144, 120), interpolation=cv2.INTER_AREA),
        "15_high_resolution": cv2.resize(standard, (1080, 900), interpolation=cv2.INTER_CUBIC),
    }


def _decode_data_url(data_url: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(data_url.split(",", 1)[1]))).convert("RGB")


def _save_mask(path: Path, mask: np.ndarray) -> None:
    Image.fromarray(mask.astype(np.uint8) * 255, mode="L").save(path)


def save_result(name: str, result: PipelineResult, output_root: Path) -> None:
    destination = output_root / name
    destination.mkdir(parents=True, exist_ok=True)
    artifacts = result.artifacts
    Image.fromarray(artifacts.original, mode="RGB").save(destination / "original.png")
    _save_mask(destination / "coarse_foreground_mask.png", artifacts.coarse_foreground_mask)
    _save_mask(destination / "leaf_tissue_mask.png", artifacts.leaf_tissue_mask)
    _save_mask(destination / "expected_leaf_mask.png", artifacts.expected_leaf_mask)
    _save_mask(destination / "internal_holes_mask.png", artifacts.internal_holes_mask)
    _save_mask(destination / "marginal_loss_mask.png", artifacts.marginal_loss_mask)
    _save_mask(destination / "removed_area_mask.png", artifacts.removed_area_mask)
    _decode_data_url(result.response["images"]["overlay"]).save(destination / "overlay.png")
    response_without_images = {key: value for key, value in result.response.items() if key != "images"}
    (destination / "metrics.json").write_text(
        json.dumps(response_without_images, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def input_images(directory: Path) -> Iterable[tuple[str, np.ndarray]]:
    for path in sorted(directory.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        yield path.stem, decode_image(path.read_bytes())


def main() -> None:
    parser = argparse.ArgumentParser(description="Salva todas as máscaras e métricas para auditoria visual.")
    parser.add_argument("--input", type=Path, help="Pasta com fotografias reais de validação.")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("validation_outputs"))
    parser.add_argument("--sensitivity", choices=("automatico", "conservador", "padrao", "sensivel"), default="automatico")
    args = parser.parse_args()
    cases = input_images(args.input) if args.input else synthetic_cases().items()
    count = 0
    for name, image in cases:
        save_result(name, segment_leaf(image, args.sensitivity), args.output)
        count += 1
    print(f"Validação concluída: {count} imagens em {args.output.resolve()}")


if __name__ == "__main__":
    main()
