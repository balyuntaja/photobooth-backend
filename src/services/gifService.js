import sharp from "sharp";
import GIFEncoder from "gifencoder";

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const FRAME_DELAY_MS = 1500;
const GIF_QUALITY = 10;

export const createGifFromPhotos = async (photoFiles) => {
  if (!photoFiles || photoFiles.length === 0) {
    throw new Error("No photos to create GIF from");
  }

  const framesToUse = photoFiles.slice(1); // skip first photo as requested

  if (framesToUse.length === 0) {
    return null;
  }

  const firstImage = sharp(framesToUse[0].buffer);
  const firstMetadata = await firstImage.metadata();

  let targetWidth = firstMetadata.width || MAX_WIDTH;
  let targetHeight = firstMetadata.height || MAX_HEIGHT;

  if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const processedFrames = await Promise.all(
    framesToUse.map(async (file) => {
      const { data } = await sharp(file.buffer)
        .resize(targetWidth, targetHeight, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      return data;
    })
  );

  if (processedFrames.length === 0) {
    return null;
  }

  const encoder = new GIFEncoder(targetWidth, targetHeight);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(FRAME_DELAY_MS);
  encoder.setQuality(GIF_QUALITY);

  const chunks = [];
  const stream = encoder.createReadStream();

  const gifBufferPromise = new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });

  processedFrames.forEach((frameData) => {
    encoder.addFrame(frameData);
  });

  encoder.finish();

  return gifBufferPromise;
};

