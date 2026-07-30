from __future__ import annotations

import base64
import io
import os
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Literal

import cv2
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage as ndi
from skimage import color, filters, measure, morphology, segmentation


Sensitivity = Literal["automatico", "conservador", "padrao", "sensivel"]
ORANGE = np.array([249, 115, 22], dtype=np.uint8)
GREEN = np.array([22, 163, 74], dtype=np.uint8)
YELLOW = np.array([250, 204, 21], dtype=np.uint8)
BROWN = np.array([124, 45, 18], dtype=np.uint8)
GRAY = np.array([148, 163, 184], dtype=np.uint8)
TEAL = np.array([15, 118, 110], dtype=np.uint8)
PIPELINE_VERSION = "2.0.0-cielab-d65"


@dataclass(slots=True)
class PipelineArtifacts:
    original: np.ndarray
    coarse_foreground_mask: np.ndarray
    leaf_tissue_mask: np.ndarray
    expected_leaf_mask: np.ndarray
    internal_holes_mask: np.ndarray
    marginal_loss_mask: np.ndarray
    removed_area_mask: np.ndarray
    background_mask: np.ndarray
    healthy_mask: np.ndarray
    chlorosis_mask: np.ndarray
    necrosis_mask: np.ndarray
    uncertain_mask: np.ndarray


@dataclass(slots=True)
class PipelineResult:
    response: dict[str, Any]
    artifacts: PipelineArtifacts


def _odd(value: float, minimum: int = 3) -> int:
    result = max(minimum, int(round(value)))
    return result if result % 2 else result + 1


def _disk_radius(area: int, fraction: float, minimum: int = 1, maximum: int = 61) -> int:
    return int(np.clip(round(np.sqrt(max(1, area)) * fraction), minimum, maximum))


def _remove_small_components(mask: np.ndarray, minimum_area: int) -> np.ndarray:
    labels = measure.label(mask, connectivity=2)
    counts = np.bincount(labels.ravel())
    keep = counts >= minimum_area
    keep[0] = False
    return keep[labels]


def _png_data_url(image: np.ndarray) -> str:
    array = image
    if array.dtype == bool:
        array = array.astype(np.uint8) * 255
    elif array.dtype != np.uint8:
        array = np.clip(array, 0, 255).astype(np.uint8)
    mode = "L" if array.ndim == 2 else "RGB"
    buffer = io.BytesIO()
    Image.fromarray(array, mode=mode).save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def decode_image(data: bytes, max_side: int = 1600) -> np.ndarray:
    with Image.open(io.BytesIO(data)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        if max(image.size) > max_side:
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        return np.asarray(image, dtype=np.uint8)


@lru_cache(maxsize=2)
def _rembg_session(model_name: str) -> Any:
    from rembg import new_session

    model_dir = os.environ.get("U2NET_HOME") or os.path.join(os.path.dirname(__file__), ".model-cache")
    os.makedirs(model_dir, exist_ok=True)
    os.environ.setdefault("U2NET_HOME", model_dir)
    return new_session(model_name)


def _rembg_mask(rgb: np.ndarray, warnings: list[str]) -> tuple[np.ndarray | None, str]:
    if os.environ.get("PHYTO_DISABLE_REMBG") == "1":
        return None, "fallback-opencv"
    try:
        from rembg import remove
    except ImportError:
        warnings.append("rembg não está instalado; a máscara inicial usou o fallback OpenCV.")
        return None, "fallback-opencv"

    for model_name in ("birefnet-general", "isnet-general-use"):
        try:
            session = _rembg_session(model_name)
            mask = remove(Image.fromarray(rgb), session=session, only_mask=True, post_process_mask=False)
            array = np.asarray(mask.convert("L"), dtype=np.uint8)
            if np.count_nonzero(array > 24) >= max(64, array.size * 0.002):
                return array, model_name
        except Exception as error:  # model download/runtime errors must not break offline use
            warnings.append(f"Modelo {model_name} indisponível ({type(error).__name__}); tentando alternativa.")
    return None, "fallback-opencv"


def _fallback_foreground(rgb: np.ndarray) -> np.ndarray:
    height, width = rgb.shape[:2]
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    border = max(1, round(min(height, width) * 0.035))
    border_pixels = np.concatenate(
        (
            lab[:border].reshape(-1, 3),
            lab[-border:].reshape(-1, 3),
            lab[:, :border].reshape(-1, 3),
            lab[:, -border:].reshape(-1, 3),
        ),
        axis=0,
    )
    background = np.median(border_pixels, axis=0)
    color_distance = np.linalg.norm(lab - background, axis=2)
    border_distance = np.linalg.norm(border_pixels - background, axis=1)
    threshold = float(np.clip(np.percentile(border_distance, 90) + 8, 13, 42))

    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    candidate = (color_distance > threshold) | ((saturation > 55) & (color_distance > threshold * 0.55))

    yy, xx = np.mgrid[:height, :width]
    central = ((xx - width / 2) / max(1, width * 0.43)) ** 2 + ((yy - height / 2) / max(1, height * 0.43)) ** 2 <= 1
    grabcut = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    grabcut[candidate] = cv2.GC_PR_FGD
    grabcut[central & candidate] = cv2.GC_FGD
    grabcut[:border] = cv2.GC_BGD
    grabcut[-border:] = cv2.GC_BGD
    grabcut[:, :border] = cv2.GC_BGD
    grabcut[:, -border:] = cv2.GC_BGD
    try:
        background_model = np.zeros((1, 65), np.float64)
        foreground_model = np.zeros((1, 65), np.float64)
        cv2.grabCut(
            cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR),
            grabcut,
            None,
            background_model,
            foreground_model,
            2,
            cv2.GC_INIT_WITH_MASK,
        )
        foreground = np.isin(grabcut, (cv2.GC_FGD, cv2.GC_PR_FGD))
    except cv2.error:
        foreground = candidate
    return ndi.gaussian_filter(foreground.astype(np.float32), sigma=max(0.8, min(height, width) * 0.002)) * 255


def _skin_mask(rgb: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    cr, cb = ycrcb[:, :, 1], ycrcb[:, :, 2]
    hue, saturation, value = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    raw = (cr >= 132) & (cr <= 181) & (cb >= 72) & (cb <= 134) & (hue <= 28) & (saturation >= 15) & (value >= 35)
    labels = measure.label(raw, connectivity=2)
    result = np.zeros_like(raw)
    minimum = max(12, round(raw.size * 0.004))
    for region in measure.regionprops(labels):
        min_row, min_col, max_row, max_col = region.bbox
        touches_edge = min_row == 0 or min_col == 0 or max_row == raw.shape[0] or max_col == raw.shape[1]
        lower_entry = max_row >= raw.shape[0] * 0.88
        if region.area >= minimum and (touches_edge or lower_entry or region.area >= raw.size * 0.04):
            result[labels == region.label] = True
    return result


def _plant_appearance(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue, saturation, value = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    green = (hue >= 28) & (hue <= 100) & (saturation >= 28) & (value >= 20)
    yellow = (hue >= 14) & (hue < 38) & (saturation >= 35) & (value >= 45)
    brown = ((hue <= 28) | (hue >= 170)) & (saturation >= 38) & (value >= 20) & (value <= 225)
    return green | yellow | brown, green


def _component_score(
    region: measure._regionprops.RegionProperties,
    rgb: np.ndarray,
    green: np.ndarray,
    skin: np.ndarray,
) -> float:
    height, width = green.shape
    min_row, min_col, max_row, max_col = region.bbox
    center_y, center_x = region.centroid
    center_distance = np.hypot((center_x - width / 2) / width, (center_y - height / 2) / height)
    area_ratio = region.area / (width * height)
    region_mask = region.image
    green_fraction = float(green[min_row:max_row, min_col:max_col][region_mask].mean())
    skin_fraction = float(skin[min_row:max_row, min_col:max_col][region_mask].mean())
    touches = min_row == 0 or min_col == 0 or max_row == height or max_col == width
    elongation = 1 - min(1.0, region.axis_minor_length / max(1.0, region.axis_major_length))
    solidity = float(region.solidity)
    gray_crop = cv2.cvtColor(rgb[min_row:max_row, min_col:max_col], cv2.COLOR_RGB2GRAY)
    texture = float(cv2.Laplacian(gray_crop, cv2.CV_32F)[region_mask].std() / 60) if region.area else 0
    area_score = min(1.8, np.sqrt(max(0, area_ratio)) * 5.2)
    return float(
        1.6 * max(0.0, 1 - center_distance * 1.75)
        + area_score
        + 1.25 * green_fraction
        + 0.45 * elongation
        + 0.55 * solidity
        + 0.25 * min(1.0, texture)
        - 2.2 * skin_fraction
        - (0.9 if touches else 0)
        - (1.1 if area_ratio > 0.72 else 0)
    )


def _select_main_leaf(rgb: np.ndarray, coarse: np.ndarray) -> tuple[np.ndarray, np.ndarray, float, list[str]]:
    height, width = coarse.shape
    appearance, green = _plant_appearance(rgb)
    skin = _skin_mask(rgb)
    strong_green = green & (cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[:, :, 1] > 70)
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    border_width = max(1, round(min(height, width) * 0.025))
    border_pixels = np.concatenate(
        (
            lab[:border_width].reshape(-1, 3),
            lab[-border_width:].reshape(-1, 3),
            lab[:, :border_width].reshape(-1, 3),
            lab[:, -border_width:].reshape(-1, 3),
        ),
        axis=0,
    )
    background_lab = np.median(border_pixels, axis=0)
    background_distance = np.linalg.norm(lab - background_lab, axis=2)
    resembles_border = background_distance <= 13
    candidate = (coarse >= 96) | ((coarse >= 36) & ~resembles_border) | (appearance & (coarse >= 12) & ~resembles_border)
    candidate &= ~(skin & ~strong_green)
    minimum_area = max(20, round(candidate.size * 0.0012))
    candidate = _remove_small_components(candidate, minimum_area)
    radius = _disk_radius(int(candidate.sum()), 0.006, maximum=max(2, round(min(height, width) * 0.018)))
    candidate = morphology.closing(candidate, morphology.disk(radius))

    labels = measure.label(candidate, connectivity=2)
    regions = [region for region in measure.regionprops(labels) if region.area >= minimum_area]
    issues: list[str] = []
    if not regions:
        issues.append("Nenhum componente foliar consistente foi encontrado.")
        return np.zeros_like(candidate), skin, 0.0, issues

    scored = sorted(((_component_score(region, rgb, green, skin), region) for region in regions), key=lambda item: item[0], reverse=True)
    score, selected_region = scored[0]
    selected = labels == selected_region.label
    trim_radius = int(np.clip(round(np.sqrt(max(1, selected_region.area)) * 0.018), 1, 12))
    opened = morphology.opening(selected, morphology.disk(trim_radius))
    opened_labels = measure.label(opened, connectivity=2)
    opened_regions = measure.regionprops(opened_labels)
    if opened_regions:
        opened_main = opened_labels == max(opened_regions, key=lambda region: region.area).label
        support = morphology.dilation(opened_main, morphology.disk(trim_radius * 2))
        trimmed = selected & support
        if trimmed.sum() >= selected.sum() * 0.68 and trimmed.sum() < selected.sum() * 0.995:
            selected = trimmed
            issues.append("Estruturas estreitas periféricas foram removidas da máscara foliar.")
    if len(scored) > 1 and score - scored[1][0] < 0.22:
        issues.append("Há mais de um objeto com aparência foliar; a seleção principal tem confiança reduzida.")
    if selected_region.area / candidate.size < 0.012:
        issues.append("A folha selecionada ocupa uma área muito pequena da fotografia.")
    confidence = float(np.clip(0.42 + score / 7.2, 0.18, 0.94))
    return selected, skin, confidence, issues


def _refine_tissue(rgb: np.ndarray, coarse: np.ndarray, seed: np.ndarray, skin: np.ndarray) -> np.ndarray:
    height, width = seed.shape
    area = int(seed.sum())
    if area == 0:
        return seed
    appearance, green = _plant_appearance(rgb)
    expansion = _disk_radius(area, 0.055, maximum=max(3, round(min(height, width) * 0.09)))
    near_seed = morphology.dilation(seed, morphology.disk(expansion))
    distance_from_seed = ndi.distance_transform_edt(~seed)
    conservative_extra = appearance & (distance_from_seed <= max(2.0, expansion * 0.38))
    allowed = ((coarse >= 18) | conservative_extra) & near_seed
    allowed &= ~(skin & ~green)
    allowed |= seed
    reconstructed = morphology.reconstruction(seed.astype(np.uint8), allowed.astype(np.uint8), method="dilation") > 0

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    edge_map = segmentation.inverse_gaussian_gradient(gray, alpha=80.0, sigma=max(1.0, min(height, width) * 0.0025))
    iterations = int(np.clip(round(min(height, width) * 0.055), 14, 42))
    try:
        active = segmentation.morphological_geodesic_active_contour(
            edge_map,
            iterations,
            init_level_set=seed.astype(np.int8),
            smoothing=1,
            threshold="auto",
            balloon=1,
        ).astype(bool)
        active &= allowed
    except (ValueError, RuntimeError):
        active = reconstructed

    if skin.any():
        gradient = filters.sobel(gray)
        markers = np.zeros(seed.shape, dtype=np.int32)
        core_radius = _disk_radius(area, 0.008, maximum=10)
        markers[morphology.erosion(seed, morphology.disk(core_radius))] = 1
        markers[skin] = 2
        border = max(1, round(min(height, width) * 0.015))
        markers[:border] = 3
        markers[-border:] = 3
        markers[:, :border] = 3
        markers[:, -border:] = 3
        watershed_leaf = segmentation.watershed(gradient, markers, mask=near_seed | skin) == 1
    else:
        watershed_leaf = reconstructed

    tissue = seed | reconstructed | (active & watershed_leaf)
    tissue &= ~(skin & ~green)
    tissue = _remove_small_components(tissue, max(12, round(area * 0.00025)))
    labels = measure.label(tissue, connectivity=2)
    overlap_labels = labels[seed]
    overlap_labels = overlap_labels[overlap_labels > 0]
    if overlap_labels.size:
        counts = np.bincount(overlap_labels)
        tissue = labels == int(np.argmax(counts))
    smooth_radius = _disk_radius(int(tissue.sum()), 0.0035, maximum=5)
    return morphology.closing(tissue, morphology.disk(smooth_radius))


def _internal_holes(
    rgb: np.ndarray,
    tissue: np.ndarray,
    coarse: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    filled = ndi.binary_fill_holes(tissue)
    candidates = filled & ~tissue
    labels = measure.label(candidates, connectivity=2)
    holes = np.zeros_like(tissue)
    rejected = np.zeros_like(tissue)
    leaf_area = max(1, int(tissue.sum()))
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    border_width = max(1, round(min(tissue.shape) * 0.025))
    border_mask = np.zeros_like(tissue)
    border_mask[:border_width] = True
    border_mask[-border_width:] = True
    border_mask[:, :border_width] = True
    border_mask[:, -border_width:] = True
    background_lab = np.median(lab[border_mask], axis=0)
    min_area = max(3, round(leaf_area * 0.00006))
    max_area = max(min_area, round(leaf_area * 0.14))

    for region in measure.regionprops(labels):
        component = labels == region.label
        if region.area < min_area:
            rejected |= component
            continue
        if region.area > max_area:
            rejected |= component
            continue
        mean_coarse = float(coarse[component].mean())
        mean_lab = lab[component].mean(axis=0)
        background_distance = float(np.linalg.norm(mean_lab - background_lab))
        mean_saturation = float(hsv[:, :, 1][component].mean())
        mean_value = float(hsv[:, :, 2][component].mean())
        bright_neutral = mean_saturation <= 28 and mean_value >= 220
        chromatic_tissue = mean_saturation >= 38 and background_distance > 32
        plausible_absence = (
            background_distance <= (3.5 if bright_neutral else 24)
            or (mean_coarse <= 55 and not bright_neutral and not chromatic_tissue)
        )
        if plausible_absence:
            holes |= component
        else:
            rejected |= component
    return holes, tissue | rejected


def _mirror_across_major_axis(mask: np.ndarray) -> np.ndarray:
    coordinates = np.column_stack(np.nonzero(mask))[:, ::-1].astype(np.float64)
    if len(coordinates) < 10:
        return mask.copy()
    center = coordinates.mean(axis=0)
    covariance = np.cov((coordinates - center).T)
    values, vectors = np.linalg.eigh(covariance)
    major = vectors[:, int(np.argmax(values))]
    normal = np.array([-major[1], major[0]])
    centered = coordinates - center
    mirrored = coordinates - 2 * np.outer(centered @ normal, normal)
    x = np.rint(mirrored[:, 0]).astype(int)
    y = np.rint(mirrored[:, 1]).astype(int)
    valid = (x >= 0) & (x < mask.shape[1]) & (y >= 0) & (y < mask.shape[0])
    result = np.zeros_like(mask)
    result[y[valid], x[valid]] = True
    return morphology.dilation(result, morphology.disk(1))


def _expected_leaf(
    tissue: np.ndarray,
    holes: np.ndarray,
    sensitivity: Sensitivity,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    base = tissue | holes
    area = max(1, int(base.sum()))
    sensitivity_key = "padrao" if sensitivity == "automatico" else sensitivity
    close_factor = {"conservador": 0.012, "padrao": 0.018, "sensivel": 0.025}[sensitivity_key]
    max_component_factor = {"conservador": 0.012, "padrao": 0.025, "sensivel": 0.04}[sensitivity_key]
    distance_factor = {"conservador": 0.018, "padrao": 0.028, "sensivel": 0.04}[sensitivity_key]
    close_radius = _disk_radius(area, close_factor, maximum=max(3, round(min(base.shape) * 0.055)))
    smoothed = ndi.gaussian_filter(base.astype(np.float32), sigma=max(0.8, close_radius * 0.42)) >= 0.47
    closed = morphology.closing(base, morphology.disk(close_radius))
    mirrored = _mirror_across_major_axis(base)
    hull = morphology.convex_hull_image(base)
    proposal = (smoothed | closed | mirrored) & hull & ~base
    distance = ndi.distance_transform_edt(~base)
    max_distance = max(2.0, np.sqrt(area) * distance_factor)
    proposal &= distance <= max_distance

    labels = measure.label(proposal, connectivity=2)
    marginal = np.zeros_like(base)
    warnings: list[str] = []
    row_counts = base.sum(axis=1, dtype=np.int32)
    broad_rows = np.flatnonzero(row_counts >= max(1, int(row_counts.max(initial=1) * 0.35)))
    lamina_bottom = int(broad_rows[-1]) if broad_rows.size else base.shape[0] - 1
    min_component = max(6, round(area * 0.00012))
    max_component = max(6, round(area * max_component_factor))
    adjacent = morphology.dilation(base, morphology.disk(1))
    for region in measure.regionprops(labels):
        component = labels == region.label
        min_row, min_col, max_row, max_col = region.bbox
        touches_image_border = min_row == 0 or min_col == 0 or max_row == base.shape[0] or max_col == base.shape[1]
        contact = np.count_nonzero(component & adjacent)
        perimeter = max(1.0, region.perimeter)
        symmetry_support = np.count_nonzero(component & mirrored) / max(1, region.area)
        close_support = np.count_nonzero(component & (closed | smoothed)) / max(1, region.area)
        component_depth = float(distance[component].max(initial=0))
        box_area = max(1, (max_row - min_row) * (max_col - min_col))
        fill_ratio = float(region.area / box_area)
        strong_symmetry = symmetry_support >= 0.35 and region.area >= area * 0.0008 and component_depth >= 2.5
        plausible = (
            not touches_image_border
            and region.centroid[0] <= lamina_bottom + close_radius
            and region.area >= min_component
            and region.area <= max_component
            and fill_ratio >= 0.22
            and component_depth >= 1.5
            and component_depth <= max_distance
            and contact / perimeter >= 0.08
            and (strong_symmetry or close_support >= 0.7)
        )
        if plausible:
            marginal |= component
    if proposal.sum() > 0 and marginal.sum() / max(1, proposal.sum()) < 0.2:
        warnings.append("Grandes reconstruções marginais foram descartadas por baixa confiança.")
    if marginal.sum() > area * 0.08:
        warnings.append("A perda marginal estimada é extensa; interprete o resultado com cautela.")
    return base | marginal, marginal, warnings


def _classify_tissue(rgb: np.ndarray, tissue: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Classifica somente tecido presente em CIELAB D65, com regularizacao espacial.

    HSV e usado apenas como evidencia auxiliar para rejeitar reflexos/sombras e
    resolver ambiguidades de matiz. As distancias e os prototipos de classe sao
    calculados no CIELAB real (L* 0..100, a*/b* aproximadamente -128..127).
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue, saturation, value = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    lab = color.rgb2lab(rgb)
    lightness = lab[:, :, 0].astype(np.float32)
    a_channel = lab[:, :, 1].astype(np.float32)
    b_channel = lab[:, :, 2].astype(np.float32)

    sigma = max(2.0, min(tissue.shape) * 0.075)
    weights = cv2.GaussianBlur(tissue.astype(np.float32), (0, 0), sigmaX=sigma, sigmaY=sigma)
    local_lightness = cv2.GaussianBlur(lightness * tissue, (0, 0), sigmaX=sigma, sigmaY=sigma)
    local_lightness = np.divide(
        local_lightness,
        np.maximum(weights, 1e-5),
        out=np.zeros_like(local_lightness),
        where=weights > 1e-5,
    )
    global_lightness = float(np.median(lightness[tissue]))
    corrected_lightness = np.clip(lightness - local_lightness + global_lightness, 0, 100)
    texture_kernel = _odd(min(tissue.shape) * 0.018)
    local_mean = cv2.GaussianBlur(corrected_lightness, (texture_kernel, texture_kernel), 0)
    local_contrast = np.abs(corrected_lightness - local_mean)

    reflection = tissue & (lightness >= 94) & ((saturation <= 48) | (np.hypot(a_channel, b_channel) <= 13))
    deep_shadow = tissue & (lightness <= 11) & (value <= 42)
    usable = tissue & ~reflection & ~deep_shadow
    if not usable.any():
        empty = np.zeros_like(tissue)
        return empty, empty.copy(), empty.copy(), tissue.copy()

    green_pool = usable & (hue >= 27) & (hue <= 105) & (saturation >= 18)
    if green_pool.sum() < max(20, usable.sum() * 0.08):
        a_threshold = float(np.percentile(a_channel[usable], 45))
        green_pool = usable & (a_channel <= a_threshold)
    else:
        a_threshold = float(np.percentile(a_channel[green_pool], 62))
        green_pool &= a_channel <= a_threshold

    healthy_lab = np.array(
        [
            np.median(corrected_lightness[green_pool]),
            np.median(a_channel[green_pool]),
            np.median(b_channel[green_pool]),
        ],
        dtype=np.float32,
    )
    corrected_lab = np.stack((corrected_lightness, a_channel, b_channel), axis=-1)
    healthy_distance = color.deltaE_ciede2000(corrected_lab, healthy_lab.reshape(1, 1, 3))
    core_distances = healthy_distance[green_pool]
    healthy_tolerance = float(np.clip(np.percentile(core_distances, 92) + 2.5, 7.5, 20))

    chlorosis_lab = np.array(
        [
            np.clip(healthy_lab[0] + 12, 42, 86),
            np.clip(healthy_lab[1] + 34, -18, 14),
            np.clip(healthy_lab[2] + 20, 24, 82),
        ],
        dtype=np.float32,
    )
    necrosis_lab = np.array(
        [
            np.clip(healthy_lab[0] - 25, 18, 52),
            np.clip(healthy_lab[1] + 48, 4, 28),
            np.clip(healthy_lab[2] - 14, 8, 42),
        ],
        dtype=np.float32,
    )
    chlorosis_distance = color.deltaE_ciede2000(corrected_lab, chlorosis_lab.reshape(1, 1, 3))
    necrosis_distance = color.deltaE_ciede2000(corrected_lab, necrosis_lab.reshape(1, 1, 3))
    delta_a = a_channel - healthy_lab[1]
    delta_b = b_channel - healthy_lab[2]
    delta_l = corrected_lightness - healthy_lab[0]

    green_evidence = (
        ((hue >= 27) & (hue <= 105) & (saturation >= 18))
        | (a_channel <= healthy_lab[1] + 7)
    )
    brown_hue = (hue <= 28) | (hue >= 170)
    necrosis = usable & brown_hue & (saturation >= 30) & (delta_a >= 17) & (
        (delta_l <= -8) | ((value <= 190) & (local_contrast >= 2.0))
    ) & (necrosis_distance <= chlorosis_distance + 3.5)
    chlorosis = usable & ~necrosis & (hue >= 14) & (hue <= 43) & (saturation >= 28) & (
        delta_a >= 9
    ) & (delta_b >= 5) & (delta_l >= -16) & (chlorosis_distance <= necrosis_distance + 5)
    healthy = usable & ~necrosis & ~chlorosis & green_evidence & (
        (healthy_distance <= healthy_tolerance * 1.5) | (delta_a <= 10)
    )
    uncertain = tissue & ~necrosis & ~chlorosis & ~healthy

    # SLIC agrega evidencias em regioes perceptualmente coerentes (CIELAB) e
    # reduz o sal-e-pimenta sem apagar lesoes pequenas de forte evidencia.
    present_area = int(tissue.sum())
    segments = int(np.clip(round(present_area / 150), 120, 900))
    try:
        superpixels = segmentation.slic(
            rgb,
            n_segments=segments,
            compactness=11,
            sigma=0.8,
            convert2lab=True,
            enforce_connectivity=True,
            min_size_factor=0.35,
            max_size_factor=3.0,
            start_label=1,
            mask=tissue,
            channel_axis=-1,
        )
        for label in np.unique(superpixels[tissue]):
            region = (superpixels == label) & tissue & ~reflection & ~deep_shadow
            size = int(region.sum())
            if size < 4:
                continue
            necrosis_fraction = float(necrosis[region].mean())
            chlorosis_fraction = float(chlorosis[region].mean())
            healthy_fraction = float(healthy[region].mean())
            if necrosis_fraction >= 0.58:
                necrosis[region] = True
                chlorosis[region] = False
                healthy[region] = False
            elif chlorosis_fraction >= 0.58:
                chlorosis[region] = True
                necrosis[region] = False
                healthy[region] = False
            elif healthy_fraction >= 0.72:
                healthy[region] = True
                necrosis[region] = False
                chlorosis[region] = False
        uncertain = tissue & ~necrosis & ~chlorosis & ~healthy
    except (ValueError, RuntimeError):
        pass

    # Nervuras claras sao lineares e muito estreitas; sem esta etapa elas podem
    # ser confundidas com clorose por terem b* elevado. Componentes compactos
    # (manchas) continuam preservados.
    chlorosis_labels = measure.label(chlorosis, connectivity=2)
    max_vein_width = max(5.0, min(tissue.shape) * 0.03)
    min_vein_length = min(tissue.shape) * 0.12
    for region in measure.regionprops(chlorosis_labels):
        vein_like = (
            region.eccentricity >= 0.985
            and region.axis_minor_length <= max_vein_width
            and region.axis_major_length >= min_vein_length
        )
        if not vein_like:
            continue
        component = chlorosis_labels == region.label
        chlorosis[component] = False
        healthy[component & usable] = True
    uncertain = tissue & ~necrosis & ~chlorosis & ~healthy

    return healthy, chlorosis, necrosis, uncertain


def _validate_marginal_loss(
    rgb: np.ndarray,
    proposed: np.ndarray,
    coarse: np.ndarray,
    skin: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    accepted = np.zeros_like(proposed)
    recovered_tissue = np.zeros_like(proposed)
    warnings: list[str] = []
    if not proposed.any():
        return accepted, recovered_tissue, warnings
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    border_width = max(1, round(min(proposed.shape) * 0.025))
    border = np.zeros_like(proposed)
    border[:border_width] = True
    border[-border_width:] = True
    border[:, :border_width] = True
    border[:, -border_width:] = True
    background_lab = np.median(lab[border], axis=0)
    appearance, _ = _plant_appearance(rgb)
    labels = measure.label(proposed, connectivity=2)
    discarded = 0
    for region in measure.regionprops(labels):
        component = labels == region.label
        mean_background_distance = float(np.linalg.norm(lab[component].mean(axis=0) - background_lab))
        mean_coarse = float(coarse[component].mean())
        skin_fraction = float(skin[component].mean())
        appearance_fraction = float(appearance[component].mean())
        resembles_external_background = mean_background_distance <= 26 and mean_coarse <= 105
        if skin_fraction >= 0.12:
            discarded += int(region.area)
        elif resembles_external_background:
            accepted |= component
        elif appearance_fraction >= 0.45 or mean_coarse >= 105:
            recovered_tissue |= component
        else:
            discarded += int(region.area)
    if recovered_tissue.any():
        warnings.append("Tecido de borda com baixa confiança foi preservado pela análise de cor e conectividade.")
    if discarded:
        warnings.append("Regiões marginais incompatíveis com fundo visível foram descartadas.")
    return accepted, recovered_tissue, warnings


def _solid_visual(mask: np.ndarray, color: np.ndarray) -> np.ndarray:
    result = np.full((*mask.shape, 3), 255, dtype=np.uint8)
    result[mask] = color
    return result


def _isolated_class(original: np.ndarray, tissue: np.ndarray, class_mask: np.ndarray, color: np.ndarray) -> np.ndarray:
    result = np.full_like(original, 255)
    muted = np.clip(original.astype(np.float32) * 0.35 + 255 * 0.65, 0, 255).astype(np.uint8)
    result[tissue] = muted[tissue]
    result[class_mask] = color
    return result


def _visualizations(
    original: np.ndarray,
    artifacts: PipelineArtifacts,
) -> dict[str, str]:
    tissue = artifacts.leaf_tissue_mask
    white = np.full_like(original, 255)
    white[tissue] = original[tissue]
    segmentation_map = np.full_like(original, 255)
    segmentation_map[artifacts.uncertain_mask] = GRAY
    segmentation_map[artifacts.healthy_mask] = GREEN
    segmentation_map[artifacts.chlorosis_mask] = YELLOW
    segmentation_map[artifacts.necrosis_mask] = BROWN
    segmentation_map[artifacts.removed_area_mask] = ORANGE

    overlay = white.copy()
    for mask, color in (
        (artifacts.healthy_mask, GREEN),
        (artifacts.chlorosis_mask, YELLOW),
        (artifacts.necrosis_mask, BROWN),
        (artifacts.uncertain_mask, GRAY),
    ):
        overlay[mask] = np.clip(overlay[mask].astype(np.float32) * 0.55 + color * 0.45, 0, 255).astype(np.uint8)
    overlay[artifacts.removed_area_mask] = ORANGE

    expected_boundary = segmentation.find_boundaries(artifacts.expected_leaf_mask, mode="inner")
    contour = white.copy()
    contour[expected_boundary] = TEAL
    contour[artifacts.removed_area_mask] = ORANGE
    return {
        "whiteBackground": _png_data_url(white),
        "overlay": _png_data_url(overlay),
        "leafMask": _png_data_url(artifacts.leaf_tissue_mask),
        "expectedLeafMask": _png_data_url(artifacts.expected_leaf_mask),
        "removedAreaMask": _png_data_url(_solid_visual(artifacts.removed_area_mask, ORANGE)),
        "segmentationMap": _png_data_url(segmentation_map),
        "expectedContour": _png_data_url(contour),
        "presentArea": _png_data_url(_solid_visual(tissue, GREEN)),
        "healthyMask": _png_data_url(_isolated_class(original, tissue, artifacts.healthy_mask, GREEN)),
        "chlorosisMask": _png_data_url(_isolated_class(original, tissue, artifacts.chlorosis_mask, YELLOW)),
        "necrosisMask": _png_data_url(_isolated_class(original, tissue, artifacts.necrosis_mask, BROWN)),
        "uncertainMask": _png_data_url(_isolated_class(original, tissue, artifacts.uncertain_mask, GRAY)),
        "coarseForegroundMask": _png_data_url(artifacts.coarse_foreground_mask),
        "internalHolesMask": _png_data_url(artifacts.internal_holes_mask),
        "marginalLossMask": _png_data_url(artifacts.marginal_loss_mask),
    }


def _area_metrics(expected: np.ndarray, tissue: np.ndarray, removed: np.ndarray) -> list[dict[str, Any]]:
    coordinates = np.argwhere(expected)
    if not len(coordinates):
        bounds = (0, 0, expected.shape[0], expected.shape[1])
    else:
        min_y, min_x = coordinates.min(axis=0)
        max_y, max_x = coordinates.max(axis=0) + 1
        bounds = (min_y, min_x, max_y, max_x)
    min_y, min_x, max_y, max_x = bounds
    height = max(1, max_y - min_y)
    width = max(1, max_x - min_x)
    yy, xx = np.mgrid[: expected.shape[0], : expected.shape[1]]
    normalized_y = (yy - min_y) / height
    normalized_x = (xx - min_x) / width
    edge_band = (normalized_x <= 0.18) | (normalized_x >= 0.82) | (normalized_y <= 0.18) | (normalized_y >= 0.82)
    zones = {
        "folhaInteira": np.ones_like(expected),
        "apice": normalized_y <= 1 / 3,
        "base": normalized_y >= 2 / 3,
        "bordas": edge_band,
    }
    results: list[dict[str, Any]] = []
    for zone_id, zone in zones.items():
        expected_area = int(np.count_nonzero(expected & zone))
        present_area = int(np.count_nonzero(tissue & zone))
        removed_area = int(np.count_nonzero(removed & zone))
        results.append(
            {
                "id": zone_id,
                "expectedLeafAreaPx": expected_area,
                "presentLeafAreaPx": present_area,
                "removedAreaPx": removed_area,
                "defoliationPercent": round(removed_area / expected_area * 100, 4) if expected_area else 0.0,
            }
        )
    return results


def segment_leaf(rgb: np.ndarray, sensitivity: Sensitivity = "automatico") -> PipelineResult:
    started = time.perf_counter()
    warnings: list[str] = []
    coarse, model_name = _rembg_mask(rgb, warnings)
    if coarse is None:
        coarse = _fallback_foreground(rgb).astype(np.uint8)

    seed, skin, selection_confidence, selection_issues = _select_main_leaf(rgb, coarse)
    warnings.extend(selection_issues)
    tissue = _refine_tissue(rgb, coarse, seed, skin)
    if not tissue.any():
        raise ValueError("Não foi possível localizar uma folha principal na imagem.")

    holes, tissue = _internal_holes(rgb, tissue, coarse)
    expected, proposed_marginal, expected_warnings = _expected_leaf(tissue, holes, sensitivity)
    warnings.extend(expected_warnings)
    marginal, recovered_tissue, marginal_warnings = _validate_marginal_loss(rgb, proposed_marginal, coarse, skin)
    warnings.extend(marginal_warnings)
    tissue |= recovered_tissue
    expected = tissue | holes | marginal
    removed = holes | marginal
    background = ~expected
    healthy, chlorosis, necrosis, uncertain = _classify_tissue(rgb, tissue)

    expected_area = int(expected.sum())
    present_area = int(tissue.sum())
    internal_area = int(holes.sum())
    marginal_area = int(marginal.sum())
    removed_area = int(removed.sum())
    if present_area < rgb.shape[0] * rgb.shape[1] * 0.012:
        warnings.append("A folha ocupa pouca área da imagem; aproxime a câmera.")
    uncertain_fraction = float(uncertain.sum() / max(1, present_area))
    if uncertain_fraction > 0.18:
        warnings.append("Sombras ou reflexos deixaram parte do tecido sem classificação confiável.")
    reconstructed_fraction = removed_area / max(1, expected_area)
    confidence = float(np.clip(selection_confidence - uncertain_fraction * 0.35 - max(0, reconstructed_fraction - 0.22) * 0.5, 0.12, 0.97))
    if confidence < 0.55:
        warnings.append("Resultado de baixa confiança; fotografe uma única folha centralizada e com luz difusa.")

    artifacts = PipelineArtifacts(
        original=rgb,
        coarse_foreground_mask=coarse >= 96,
        leaf_tissue_mask=tissue,
        expected_leaf_mask=expected,
        internal_holes_mask=holes,
        marginal_loss_mask=marginal,
        removed_area_mask=removed,
        background_mask=background,
        healthy_mask=healthy,
        chlorosis_mask=chlorosis,
        necrosis_mask=necrosis,
        uncertain_mask=uncertain,
    )
    metrics = {
        "expectedLeafAreaPx": expected_area,
        "presentLeafAreaPx": present_area,
        "internalHoleAreaPx": internal_area,
        "marginalLossAreaPx": marginal_area,
        "removedAreaPx": removed_area,
        "defoliationPercent": round(removed_area / expected_area * 100, 4) if expected_area else 0.0,
        "healthyPercent": round(int(healthy.sum()) / max(1, present_area) * 100, 4),
        "chlorosisPercent": round(int(chlorosis.sum()) / max(1, present_area) * 100, 4),
        "necrosisPercent": round(int(necrosis.sum()) / max(1, present_area) * 100, 4),
    }
    response = {
        "success": True,
        "confidence": round(confidence, 4),
        "metrics": metrics,
        "images": _visualizations(rgb, artifacts),
        "warnings": list(dict.fromkeys(warnings)),
        "areas": _area_metrics(expected, tissue, removed),
        "model": model_name,
        "pipelineVersion": PIPELINE_VERSION,
        "processingTimeMs": round((time.perf_counter() - started) * 1000, 2),
    }
    return PipelineResult(response=response, artifacts=artifacts)
