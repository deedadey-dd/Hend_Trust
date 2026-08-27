import logoSvg from '../assets/hendaxis_trust_logo.svg';

/**
 * Compress an image file using HTMLCanvasElement, apply a subtle HendAxis Trust logo
 * hologram watermark overlay in the center, and convert it to WebP format.
 * 
 * @param file The image file selected by the user
 * @param maxDimension Maximum width or height of the compressed image in pixels (default: 1200)
 * @param quality WebP compression quality from 0.0 to 1.0 (default: 0.75)
 * @returns A Promise resolving to a base64 data URL string (e.g. data:image/webp;base64,...)
 */
export const compressImageToWebP = (
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = (err) => reject(err);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = (err) => reject(err);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target?.result as string);
        }

        // Draw original uploaded image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Load HendAxis Trust Logo for Hologram Watermark
        const watermark = new Image();
        watermark.src = logoSvg;

        const finishCompression = () => {
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };

        watermark.onload = () => {
          try {
            // Hologram sizing: ~45% of smallest dimension
            const watermarkSize = Math.min(width, height) * 0.45;
            const wmAspect = watermark.height > 0 ? watermark.width / watermark.height : 3.5;
            const wmW = watermarkSize * (wmAspect > 1 ? 1 : wmAspect);
            const wmH = wmW / wmAspect;
            const wmX = (width - wmW) / 2;
            const wmY = (height - wmH) / 2;

            // Apply hologram transparency (22% opacity)
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.drawImage(watermark, wmX, wmY, wmW, wmH);
            ctx.restore();
          } catch {
            /* ignore watermark errors if canvas tainted */
          }
          finishCompression();
        };

        watermark.onerror = () => {
          finishCompression();
        };
      };
    };
  });
};
