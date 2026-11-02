const PNG_TYPE = "image/png";
const BACKGROUND_COLOR = "#ffffff";

/**
 * Renders the image at its on-screen size: the same pixels as a screen capture,
 * so `image-width` directives apply. The white background matches the lightbox.
 */
function renderDisplayedImage(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const scale = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.clientWidth * scale);
    canvas.height = Math.round(image.clientHeight * scale);
    const context = canvas.getContext("2d");
    if (!context || !image.naturalWidth || !canvas.width || !canvas.height) {
      reject(new Error("Image is not rendered"));
      return;
    }
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // toBlob throws on a canvas tainted by a cross-origin image.
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Empty image"))), PNG_TYPE);
  });
}

/**
 * The blob is handed over as a promise: Safari only accepts a clipboard write
 * started synchronously within the user gesture.
 */
export function copyDisplayedImage(image: HTMLImageElement): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ [PNG_TYPE]: renderDisplayedImage(image) })]);
}
