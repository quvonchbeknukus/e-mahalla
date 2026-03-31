export const MAX_IMAGES_PER_TASK = 4;
export const MAX_TASK_IMAGE_SIZE_MB = 10;
export const MAX_TASK_IMAGE_SIZE_BYTES =
  MAX_TASK_IMAGE_SIZE_MB * 1024 * 1024;
export const TASK_IMAGE_SIZE_ERROR_MESSAGE = `Fayl hajmi ${MAX_TASK_IMAGE_SIZE_MB} MB dan oshib ketdi.`;
export const TASK_IMAGE_AUTO_OPTIMIZE_NOTE =
  "Rasmlar tezroq yuklanishi uchun avtomatik optimallashtiriladi.";
export const TASK_IMAGE_PROCESSING_MESSAGE = "Rasmlar optimallashtirilmoqda...";
export const TASK_IMAGE_READY_MESSAGE =
  "Rasmlar tezroq yuklanishi uchun tayyorlandi.";
export const TASK_IMAGE_WAIT_MESSAGE =
  "Rasmlar optimallashtirilmoqda, biroz kuting.";

const TASK_IMAGE_OPTIMIZE_THRESHOLD_BYTES = 1024 * 1024;
const TASK_IMAGE_MAX_DIMENSION = 1920;
const TASK_IMAGE_OUTPUT_QUALITY = 0.82;
const TASK_IMAGE_SKIPPED_TYPES = new Set(["image/gif", "image/svg+xml"]);

export function isTaskImageTooLarge(file) {
  return Number(file?.size ?? 0) > MAX_TASK_IMAGE_SIZE_BYTES;
}

export function hasOversizedTaskImages(fileList) {
  return Array.from(fileList ?? []).some((file) => isTaskImageTooLarge(file));
}

export function filterValidTaskImages(fileList) {
  return Array.from(fileList ?? []).filter(
    (file) => !isTaskImageTooLarge(file)
  );
}

function getTaskImageOutputTypes(file) {
  if (file.type === "image/png") {
    return ["image/webp", "image/png"];
  }

  if (file.type === "image/webp") {
    return ["image/webp"];
  }

  return ["image/webp", "image/jpeg"];
}

function getTaskImageExtension(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function buildOptimizedTaskImageName(name, mimeType) {
  const baseName = String(name ?? "task-image")
    .replace(/\.[^.]+$/, "")
    .trim();

  return `${baseName || "task-image"}.${getTaskImageExtension(mimeType)}`;
}

function getScaledTaskImageDimensions(width, height) {
  const longestSide = Math.max(width, height);

  if (!longestSide || longestSide <= TASK_IMAGE_MAX_DIMENSION) {
    return { width, height };
  }

  const scale = TASK_IMAGE_MAX_DIMENSION / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadTaskImage(file) {
  return new Promise((resolve, reject) => {
    if (
      typeof Image === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      reject(new Error("Image loading is not supported."));
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        cleanup: () => URL.revokeObjectURL(imageUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Image loading failed."));
    };

    image.decoding = "async";
    image.src = imageUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

async function optimizeTaskImageFile(file) {
  if (
    !file ||
    typeof document === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    !String(file.type ?? "").startsWith("image/") ||
    TASK_IMAGE_SKIPPED_TYPES.has(file.type)
  ) {
    return file;
  }

  const loadedImage = await loadTaskImage(file);

  try {
    const { width, height, image } = loadedImage;
    const { width: nextWidth, height: nextHeight } =
      getScaledTaskImageDimensions(width, height);
    const shouldResize = nextWidth !== width || nextHeight !== height;
    const shouldCompress =
      shouldResize || file.size > TASK_IMAGE_OPTIMIZE_THRESHOLD_BYTES;

    if (!shouldCompress) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, nextWidth, nextHeight);

    let optimizedBlob = null;

    for (const outputType of getTaskImageOutputTypes(file)) {
      optimizedBlob = await canvasToBlob(
        canvas,
        outputType,
        TASK_IMAGE_OUTPUT_QUALITY
      );

      if (optimizedBlob) {
        break;
      }
    }

    if (!optimizedBlob || optimizedBlob.size >= file.size) {
      return file;
    }

    return new File(
      [optimizedBlob],
      buildOptimizedTaskImageName(file.name, optimizedBlob.type),
      {
        type: optimizedBlob.type,
        lastModified: file.lastModified,
      }
    );
  } finally {
    loadedImage.cleanup();
  }
}

export async function optimizeTaskImages(fileList) {
  const files = Array.from(fileList ?? []);

  const optimizedFiles = await Promise.all(
    files.map(async (file) => {
      try {
        const optimizedFile = await optimizeTaskImageFile(file);

        return {
          file: optimizedFile,
          optimized: optimizedFile !== file,
        };
      } catch {
        return {
          file,
          optimized: false,
        };
      }
    })
  );

  return {
    files: optimizedFiles.map((item) => item.file),
    optimizedCount: optimizedFiles.filter((item) => item.optimized).length,
  };
}
