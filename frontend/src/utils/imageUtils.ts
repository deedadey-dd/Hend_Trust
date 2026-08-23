/**
 * Compress an image file using HTMLCanvasElement and convert it to WebP format.
 * Reduces raw 3MB-10MB camera photos to ~50KB-150KB WebP base64 data URLs.
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

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Attempt WebP export, falling back to JPEG if WebP unsupported
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
    };
  });
};
