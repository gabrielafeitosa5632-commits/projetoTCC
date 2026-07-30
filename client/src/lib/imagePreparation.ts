const DEFAULT_MAX_SIDE = 1600;
const JPEG_QUALITY = 0.9;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

/**
 * Keeps camera/gallery images at a phone-friendly working size before they
 * enter React state. The analysis pipeline already works on a smaller copy;
 * normalizing here prevents the original multi-megapixel bitmap from staying
 * alive alongside all segmentation masks in the Android WebView.
 */
export async function prepareImageFile(
  file: File,
  maxSide = DEFAULT_MAX_SIDE
): Promise<string> {
  if (typeof createImageBitmap !== "function") {
    return readFileAsDataUrl(file);
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return readFileAsDataUrl(file);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(outputType, JPEG_QUALITY);
  } catch {
    return readFileAsDataUrl(file);
  } finally {
    bitmap?.close();
  }
}
