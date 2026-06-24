const SAFARI_UNSUPPORTED_CAPTURE_STYLES = [
  'filter',
  'backdrop-filter',
  '-webkit-backdrop-filter',
  'mix-blend-mode',
];

type CaptureDebugInfo = {
  userAgent: string;
  isWebKitCaptureFallback: boolean;
  width: number;
  height: number;
  imageCount: number;
};

type CaptureOptions = {
  backgroundColor?: string;
  width?: number;
  height?: number;
  preferSvgRenderer?: boolean;
};

const DEFAULT_CAPTURE_BACKGROUND_COLOR = '#fdfcfa';
const CAPTURE_IMAGE_PLACEHOLDER_COLOR = '#eef3ee';

function isWebKitCaptureFallbackRequired() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  return isIOS || isSafari;
}

function resolveImageUrl(src: string, cacheBust = false) {
  const url = new URL(src, window.location.href);

  if (window.location.protocol === 'https:' && url.protocol === 'http:') {
    url.protocol = 'https:';
  }

  if (
    (url.protocol === 'http:' || url.protocol === 'https:')
    && url.origin !== window.location.origin
  ) {
    const proxyUrl = new URL('/api/image-proxy', window.location.href);
    proxyUrl.searchParams.set('url', url.toString());
    if (cacheBust) {
      proxyUrl.searchParams.set('sison_capture_cache_bust', String(Date.now()));
    }
    return proxyUrl.toString();
  }

  if (cacheBust && url.protocol !== 'data:' && url.protocol !== 'blob:') {
    url.searchParams.set('sison_capture_cache_bust', String(Date.now()));
  }

  return url.toString();
}

function buildCaptureDebugInfo(element: HTMLElement, width: number, height: number): CaptureDebugInfo {
  return {
    userAgent: window.navigator.userAgent,
    isWebKitCaptureFallback: isWebKitCaptureFallbackRequired(),
    width,
    height,
    imageCount: element.querySelectorAll('img').length,
  };
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map(async (image) => {
      const src = image.currentSrc || image.src;
      if (!src) return;

      if (image.complete && image.naturalWidth > 0) {
        try {
          await image.decode?.();
        } catch {
          // Safari may reject decode for cached images even though the image is usable.
        }
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          window.clearTimeout(timeout);
          image.removeEventListener('load', handleLoad);
          image.removeEventListener('error', handleError);
        };
        const handleLoad = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          console.error('[capture] image load failed', { src });
          resolve();
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          console.error('[capture] image load timed out', { src });
          resolve();
        }, 8000);

        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });
      });
    }),
  );
}

async function prepareElementForCapture(element: HTMLElement) {
  await document.fonts?.ready;
  await waitForImages(element);
  await nextFrame();
}

async function imageUrlToDataUrl(src: string, cacheBust = false) {
  const response = await fetch(resolveImageUrl(src, cacheBust), {
    mode: 'cors',
    cache: cacheBust ? 'reload' : 'default',
  });

  if (!response.ok) {
    throw new Error(`Image request failed: ${response.status}`);
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

function sanitizeCaptureStyles(target: HTMLElement) {
  for (const property of SAFARI_UNSUPPORTED_CAPTURE_STYLES) {
    target.style.removeProperty(property);
  }
}

function copyComputedStyles(source: Element, target: Element) {
  const computedStyle = window.getComputedStyle(source);
  let styleText = '';

  for (const property of Array.from(computedStyle)) {
    styleText += `${property}:${computedStyle.getPropertyValue(property)};`;
  }

  (target as HTMLElement).style.cssText = styleText;
  sanitizeCaptureStyles(target as HTMLElement);

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

      cloneImage.crossOrigin = 'anonymous';
      cloneImage.removeAttribute('srcset');
      try {
        cloneImage.src = await imageUrlToDataUrl(src, true);
      } catch (error) {
        console.error('[capture] image inline failed, using placeholder', { src, error });
        cloneImage.removeAttribute('src');
        cloneImage.style.background = CAPTURE_IMAGE_PLACEHOLDER_COLOR;
      }
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
      reject(new Error('Card capture failed while loading serialized SVG'));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function getRelativeRect(element: Element, rootRect: DOMRect) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left - rootRect.left,
    y: rect.top - rootRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function getNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLineHeight(style: CSSStyleDeclaration) {
  const fontSize = getNumber(style.fontSize, 16);
  return style.lineHeight === 'normal' ? fontSize * 1.2 : getNumber(style.lineHeight, fontSize * 1.2);
}

function applyRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function extractGradientColors(backgroundImage: string) {
  return backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) ?? [];
}

function createBackgroundFill(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (style.backgroundImage.startsWith('linear-gradient')) {
    const colors = extractGradientColors(style.backgroundImage);

    if (colors.length >= 2) {
      const gradient = context.createLinearGradient(x, y, x + width, y + height);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      return gradient;
    }
  }

  return style.backgroundColor;
}

function hasVisibleFill(style: CSSStyleDeclaration) {
  return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage.startsWith('linear-gradient');
}

async function loadDrawableImage(image: HTMLImageElement) {
  const src = image.currentSrc || image.src;
  if (!src) return null;

  try {
    const dataUrl = src.startsWith('data:') ? src : await imageUrlToDataUrl(src, true);
    const drawable = new Image();
    drawable.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      drawable.onload = () => resolve();
      drawable.onerror = () => reject(new Error(`Canvas image decode failed: ${src}`));
      drawable.src = dataUrl;
    });

    return drawable;
  } catch (error) {
    console.error('[capture] canvas image draw fallback to placeholder', { src, error });
    return null;
  }
}

function drawImagePlaceholder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = CAPTURE_IMAGE_PLACEHOLDER_COLOR;
  context.fillRect(x, y, width, height);
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  let dw = width;
  let dh = height;
  let dx = x;
  let dy = y;

  if (sourceRatio > targetRatio) {
    dh = width / sourceRatio;
    dy = y + (height - dh) / 2;
  } else {
    dw = height * sourceRatio;
    dx = x + (width - dw) / 2;
  }

  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, dx, dy, dw, dh);
}

function drawImageWithObjectFit(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  switch (style.objectFit) {
    case 'fill':
      context.drawImage(image, x, y, width, height);
      return;
    case 'contain':
      drawImageContain(context, image, x, y, width, height);
      return;
    case 'none': {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      context.drawImage(image, x, y, sourceWidth, sourceHeight);
      return;
    }
    case 'scale-down': {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (sourceWidth <= width && sourceHeight <= height) {
        context.drawImage(image, x, y, sourceWidth, sourceHeight);
      } else {
        drawImageContain(context, image, x, y, width, height);
      }
      return;
    }
    case 'cover':
    default:
      drawImageCover(context, image, x, y, width, height);
  }
}

function applyAIFramePhotoEdgeOverlayClip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const ellipses = [
    { cx: 0.50, cy: 0.08, rx: 0.56, ry: 0.20 },
    { cx: 0.84, cy: 0.12, rx: 0.34, ry: 0.24 },
    { cx: 0.93, cy: 0.38, rx: 0.24, ry: 0.46 },
    { cx: 0.07, cy: 0.46, rx: 0.22, ry: 0.42 },
    { cx: 0.54, cy: 0.72, rx: 0.56, ry: 0.22 },
    { cx: 0.78, cy: 0.70, rx: 0.38, ry: 0.24 },
    { cx: 0.86, cy: 0.84, rx: 0.32, ry: 0.32 },
    { cx: 0.17, cy: 0.70, rx: 0.28, ry: 0.22 },
  ];

  context.beginPath();
  for (const ellipse of ellipses) {
    context.ellipse(
      x + width * ellipse.cx,
      y + height * ellipse.cy,
      width * ellipse.rx,
      height * ellipse.ry,
      0,
      0,
      Math.PI * 2,
    );
  }
  context.clip();
}

function truncateText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 0 && context.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
}

function drawTextElement(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  style: CSSStyleDeclaration,
  rootRect: DOMRect,
) {
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  if (!text) return;

  const rect = getRelativeRect(element, rootRect);
  const fontSize = getNumber(style.fontSize, 16);
  const lineHeight = getLineHeight(style);
  const paddingLeft = getNumber(style.paddingLeft);
  const paddingRight = getNumber(style.paddingRight);
  const maxWidth = Math.max(0, rect.width - paddingLeft - paddingRight);

  context.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  context.fillStyle = style.color;
  context.textBaseline = 'top';
  context.textAlign = style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'right' : 'left';

  const x =
    context.textAlign === 'center'
      ? rect.x + rect.width / 2
      : context.textAlign === 'right'
        ? rect.x + rect.width - paddingRight
        : rect.x + paddingLeft;
  const y = rect.y + Math.max(0, (rect.height - lineHeight) / 2);

  context.fillText(truncateText(context, text, maxWidth), x, y, maxWidth);
}

async function drawElementTree(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  rootRect: DOMRect,
  inheritedAlpha = 1,
) {
  const style = window.getComputedStyle(element);

  if (style.display === 'none' || style.visibility === 'hidden') return;

  const rect = getRelativeRect(element, rootRect);
  if (rect.width <= 0 || rect.height <= 0) return;

  const opacity = inheritedAlpha * getNumber(style.opacity, 1);
  const radius = Math.max(
    getNumber(style.borderTopLeftRadius),
    getNumber(style.borderTopRightRadius),
    getNumber(style.borderBottomRightRadius),
    getNumber(style.borderBottomLeftRadius),
  );

  context.save();
  context.globalAlpha = opacity;

  if (style.overflow !== 'visible' || element instanceof HTMLImageElement) {
    applyRoundedRect(context, rect.x, rect.y, rect.width, rect.height, radius);
    context.clip();
  }

  if (hasVisibleFill(style)) {
    context.fillStyle = createBackgroundFill(context, style, rect.x, rect.y, rect.width, rect.height);
    applyRoundedRect(context, rect.x, rect.y, rect.width, rect.height, radius);
    context.fill();
  }

  if (element instanceof HTMLImageElement) {
    const drawable = await loadDrawableImage(element);
    if (drawable) {
      if (element.classList.contains('ai-frame-photo-edge-overlay')) {
        context.save();
        applyAIFramePhotoEdgeOverlayClip(context, rect.x, rect.y, rect.width, rect.height);
        drawImageWithObjectFit(context, drawable, style, rect.x, rect.y, rect.width, rect.height);
        context.restore();
      } else {
        drawImageWithObjectFit(context, drawable, style, rect.x, rect.y, rect.width, rect.height);
      }
    } else {
      drawImagePlaceholder(context, rect.x, rect.y, rect.width, rect.height);
    }
  } else {
    const children = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const isTextLeaf = children.length === 0 && Boolean(element.textContent?.trim());

    if (isTextLeaf) {
      drawTextElement(context, element, style, rootRect);
    }

    for (const child of children) {
      await drawElementTree(context, child, rootRect, opacity);
    }
  }

  const borderTopWidth = getNumber(style.borderTopWidth);
  if (borderTopWidth > 0 && style.borderTopColor !== 'rgba(0, 0, 0, 0)') {
    context.strokeStyle = style.borderTopColor;
    context.lineWidth = borderTopWidth;
    context.beginPath();
    context.moveTo(rect.x, rect.y + borderTopWidth / 2);
    context.lineTo(rect.x + rect.width, rect.y + borderTopWidth / 2);
    context.stroke();
  }

  context.restore();
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        console.info('[capture] blob created', { size: blob.size, type: blob.type });
        resolve(blob);
      } else {
        console.error('[capture] blob create failed', { reason: 'canvas.toBlob returned null' });
        reject(new Error('Canvas toBlob returned null'));
      }
    }, 'image/png');
  });
}

function fillCanvasBackground(context: CanvasRenderingContext2D, width: number, height: number, backgroundColor: string) {
  if (backgroundColor === 'transparent') return;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);
  context.restore();
}

async function captureElementWithCanvasFallback(
  element: HTMLElement,
  width: number,
  height: number,
  scale: number,
  backgroundColor: string,
) {
  const rootRect = element.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  console.info('[capture] canvas created', { width: canvas.width, height: canvas.height, mode: 'canvas-fallback' });

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }

  fillCanvasBackground(context, canvas.width, canvas.height, backgroundColor);
  context.scale(scale, scale);
  await drawElementTree(context, element, rootRect);

  return canvasToPngBlob(canvas);
}

export async function captureElementAsPng(element: HTMLElement, scale = 2, options: CaptureOptions = {}) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(options.width ?? rect.width);
  const height = Math.ceil(options.height ?? rect.height);
  const debugInfo = buildCaptureDebugInfo(element, width, height);
  const backgroundColor = options.backgroundColor || DEFAULT_CAPTURE_BACKGROUND_COLOR;

  console.info('[capture] capture start', debugInfo);

  if (width === 0 || height === 0) {
    throw new Error('Capture target is empty');
  }

  try {
    await prepareElementForCapture(element);

    if (!options.preferSvgRenderer && isWebKitCaptureFallbackRequired()) {
      return await captureElementWithCanvasFallback(element, width, height, Math.min(scale, 2), backgroundColor);
    }

    try {
    const clone = element.cloneNode(true) as HTMLElement;
    copyComputedStyles(element, clone);
    await inlineImages(element, clone);

    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    clone.style.margin = '0';
    // 투명 캡처 모드에서는 클론 자체의 배경(예: 카드 bg-white)을 덮어쓰지 않는다.
    // 그래야 둥근 모서리 안쪽은 원본 색이 유지되고, 바깥쪽 사각형 영역만 투명해진다.
    if (backgroundColor !== 'transparent') {
      clone.style.backgroundColor = backgroundColor;
    }

    const serializedNode = new XMLSerializer().serializeToString(clone);
    const svgBackgroundRect = backgroundColor === 'transparent' ? '' : `<rect width="100%" height="100%" fill="${backgroundColor}" />`;
    const wrapperBackground = backgroundColor === 'transparent' ? 'transparent' : backgroundColor;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${svgBackgroundRect}
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:${wrapperBackground};">
            ${serializedNode}
          </div>
        </foreignObject>
      </svg>
    `;

    const image = await loadSerializedSvg(svg);
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    console.info('[capture] canvas created', { width: canvas.width, height: canvas.height, mode: 'svg' });

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context unavailable');
    }

    fillCanvasBackground(context, canvas.width, canvas.height, backgroundColor);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    return await canvasToPngBlob(canvas);
    } catch (svgError) {
      // Some Android/Samsung Internet builds fail on the SVG foreignObject path
      // (tainted canvas / foreignObject rendering limits). Fall back to the
      // manual canvas renderer so downloads still succeed there.
      console.warn('foreignObject capture failed, falling back to canvas renderer', svgError);
      return await captureElementWithCanvasFallback(element, width, height, Math.min(scale, 2), backgroundColor);
    }
  } catch (error) {
    console.error('captureElementAsPng failed', { error, debugInfo });
    throw error;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  console.info('[capture] download start', { filename, size: blob.size, type: blob.type });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}
