import { describe, it, expect } from 'vitest';
import { compressImageToWebP } from './imageUtils';

describe('imageUtils - compressImageToWebP', () => {
  it('rejects if input file is not an image', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    await expect(compressImageToWebP(textFile)).rejects.toThrow('Selected file is not an image.');
  });
});
