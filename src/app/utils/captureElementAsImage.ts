function resolveImageUrl(src: string) {
  return new URL(src, window.location.href).toString();
}

async function imageUrlToDataUrl(src: string) {
  const response = await fetch(resolveImageUrl(src), { mode: 'cors' });

  if (!response.ok) {
    throw new Error('Image request failed');
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Image encoding failed'));
      }
    };
    reader.onerror = () => reject(new Error('Image encoding failed'));
    reader.readAsDataURL(blob);
  });
}

function copyComputedStyles(source: Element, target: Element) {
  const computedStyle = window.getComputedStyle(source);
  let styleText = '';

  for (const property of Array.from(computedStyle)) {
    styleText += `${property}:${computedStyle.getPropertyValue(property)};`;
  }

  (target as HTMLElement).style.cssText = styleText;

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children[index];

    if (targetChild) {
      copyComputedStyles(sourceChild, targetChild);
    }
  });
}

async function inlineImages(source: HTMLElement, clone: HTMLElement) {
  const sourceImages = Array.from(source.querySelectorAll('img'));
  const cloneImages = Array.from(clone.querySelectorAll('img'));

  await Promise.all(
    cloneImages.map(async (cloneImage, index) => {
      const sourceImage = sourceImages[index];
      const src = sourceImage?.currentSrc || sourceImage?.src || cloneImage.currentSrc || cloneImage.src;

      if (!src || src.startsWith('data:')) return;

      cloneImage.src = await imageUrlToDataUrl(src);
      cloneImage.removeAttribute('srcset');
    }),
  );
}

function loadSerializedSvg(svg: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('Card capture failed'));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function captureElementAsPng(element: HTMLElement, scale = 2) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);

  if (width === 0 || height === 0) {
    throw new Error('Capture target is empty');
  }

  const clone = element.cloneNode(true) as HTMLElement;
  await document.fonts?.ready;
  copyComputedStyles(element, clone);
  await inlineImages(element, clone);

  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  clone.style.margin = '0';
  clone.style.transform = 'none';

  const serializedNode = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">
          ${serializedNode}
        </div>
      </foreignObject>
    </svg>
  `;

  const image = await loadSerializedSvg(svg);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }

  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Card image export failed'));
      }
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
