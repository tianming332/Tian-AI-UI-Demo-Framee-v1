import { compareParsed, parseFileName } from './naming';

const MAX_BYTES = 30 * 1024 * 1024;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

export type ImportedImage = {
  file: File;
  fileName: string;
  name: string;
  order: number | null;
  width: number;
  height: number;
};

export type ImportOutcome = {
  images: ImportedImage[];
  ignored: string[];
};

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT.test(file.name);
}

async function readSize(file: File): Promise<{ width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      // from-image：JPEG 带 EXIF 旋转时按显示方向取尺寸
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      /* 交给下面的 <img> 兜底 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 读取拖入的文件：过滤非图片与超大文件，解码尺寸，按序号/文件名排序 */
export async function importImages(fileList: File[] | FileList): Promise<ImportOutcome> {
  const files = Array.from(fileList);
  const ignored: string[] = [];
  const images: ImportedImage[] = [];

  for (const file of files) {
    if (!isImage(file)) {
      ignored.push(file.name);
      continue;
    }
    if (file.size > MAX_BYTES) {
      ignored.push(`${file.name}（超过 30MB）`);
      continue;
    }
    try {
      const { width, height } = await readSize(file);
      const parsed = parseFileName(file.name);
      images.push({ file, fileName: file.name, name: parsed.name, order: parsed.order, width, height });
    } catch {
      ignored.push(`${file.name}（无法解码）`);
    }
  }

  images.sort(compareParsed);
  return { images, ignored };
}
