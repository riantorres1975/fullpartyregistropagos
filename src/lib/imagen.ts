// Comprime y reduce una imagen en el navegador antes de guardarla.
// La convierte a WebP (mejor compresión). Si el navegador no soporta
// codificar WebP, canvas.toDataURL hace fallback a PNG automáticamente.
export async function comprimirImagen(
  file: File,
  maxDim = 1280,
  calidad = 0.7,
): Promise<string> {
  const dataUrl = await leerComoDataUrl(file);

  // Los PDF u otros no-imagen se devuelven tal cual (sin comprimir).
  if (!file.type.startsWith("image/")) return dataUrl;

  const img = await cargarImagen(dataUrl);
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const escala = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * escala);
    height = Math.round(height * escala);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/webp", calidad);
}

// Prepara una imagen SOLO para el OCR (no para guardar): la lleva a ~1000px
// de ancho (amplía las capturas chicas de los bancos —que suelen venir a
// 230-530px— y reduce las enormes) y la pasa a escala de grises. Esto mejora
// mucho la lectura de Tesseract frente a la versión WebP comprimida que se
// guarda. Ampliar demasiado (p.ej. 1400px) hace que los montos grandes se
// lean mal, por eso el objetivo es moderado.
export async function prepararParaOCR(
  file: File,
  anchoObjetivo = 1000,
): Promise<string> {
  const dataUrl = await leerComoDataUrl(file);
  if (!file.type.startsWith("image/")) return dataUrl;

  const img = await cargarImagen(dataUrl);
  let { width, height } = img;
  let escala = 1;
  if (width < anchoObjetivo) escala = Math.min(4, anchoObjetivo / width);
  else if (width > 1600) escala = 1600 / width;
  width = Math.round(width * escala);
  height = Math.round(height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  // Escala de grises (luminancia) para uniformar fondos de colores (Azteca,
  // Spin, Mercado Pago) y mejorar el contraste del texto.
  const datos = ctx.getImageData(0, 0, width, height);
  const px = datos.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  ctx.putImageData(datos, 0, 0);
  // PNG para no perder nitidez (el OCR no necesita archivo chico).
  return canvas.toDataURL("image/png");
}

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
