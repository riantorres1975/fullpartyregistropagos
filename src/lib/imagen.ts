// Comprime y reduce una imagen en el navegador antes de guardarla.
// Devuelve un data URL (JPEG) listo para enviar al servidor.
export async function comprimirImagen(
  file: File,
  maxDim = 1280,
  calidad = 0.6,
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
  return canvas.toDataURL("image/jpeg", calidad);
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
