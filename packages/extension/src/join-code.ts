// Reading a community's QR code: off a capture of the page the person is on,
// off an image they dropped or pasted, or off a camera frame.
//
// Chrome's `BarcodeDetector` is not available on Windows or Linux, so the
// decoding is `jsqr` (pure JavaScript, bundled). The DOM is needed for a
// canvas; `community-did.ts` holds the DOM-free part so the background can
// share it.
//
// A tab capture is a whole screen on which the code is a few hundred pixels,
// so decoding is tried at several scales: full size first (a small code needs
// every pixel), then halved and quartered (a very large capture is faster and
// cleaner small), then doubled (a tiny code).

import jsQR from "jsqr";
import { communityDidFromText } from "./community-did.js";

export { communityDidFromText };

/** The DID carried by a QR code in `image`, or `undefined` when there is no
 *  readable code or it carries no DID. */
export function didFromImageData(image: ImageData): string | undefined {
  const code = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return code ? communityDidFromText(code.data) : undefined;
}

const SCALES = [1, 0.5, 0.25, 2];
/** Pixels a single attempt may hold; above this a scale is skipped. */
const MAX_PIXELS = 16_000_000;

/** Decode from anything a canvas can draw, trying each scale in turn. */
export function didFromCanvasSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | undefined {
  if (!(width > 0 && height > 0)) return undefined;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return undefined;
  for (const scale of SCALES) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    if (w * h > MAX_PIXELS) continue;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    const did = didFromImageData(ctx.getImageData(0, 0, w, h));
    if (did) return did;
  }
  return undefined;
}

/** Decode from an image URL: a `data:` URL from `tabs.captureVisibleTab`, or
 *  an object URL of a dropped file. */
export async function didFromImageUrl(url: string): Promise<string | undefined> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("The image couldn't be read."));
    i.src = url;
  });
  return didFromCanvasSource(img, img.naturalWidth, img.naturalHeight);
}

export async function didFromFile(file: Blob): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    return await didFromImageUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** What a person dropped or pasted: an image with a code on it, or text with
 *  a DID in it. Images first — a screenshot pasted from the clipboard comes
 *  with no text. */
export async function didFromDataTransfer(dt: DataTransfer): Promise<string | undefined> {
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const did = await didFromFile(file);
    if (did) return did;
  }
  const text = dt.getData("text/plain") || dt.getData("text");
  return text ? communityDidFromText(text) : undefined;
}

/** The code on the page the person was looking at: a capture of the active
 *  tab of `windowId` (the current window when absent), decoded here. Needs
 *  `activeTab` (granted by opening the popup) or a host permission for the
 *  page. */
export async function didFromVisibleTab(windowId?: number): Promise<string | undefined> {
  const shot =
    windowId === undefined
      ? await chrome.tabs.captureVisibleTab({ format: "png" })
      : await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  return didFromImageUrl(shot);
}
