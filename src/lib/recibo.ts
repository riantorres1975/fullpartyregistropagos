// Genera una imagen (PNG) tipo "comprobante" con los datos de una transferencia,
// para compartir con el cliente por WhatsApp o descargarla. Se dibuja en un
// canvas (sin librerías). Devuelve un Blob PNG.

export type DatosRecibo = {
  fecha: string; // ya formateada
  cliente: string;
  montoStr: string; // ya formateado (ej. "$1,234.00")
  bancoDestino: string | null;
  cuenta: string | null; // enmascarado, ej. "•••• 1234"
  referencia: string | null;
  reflejada: boolean;
};

export async function generarReciboBlob(d: DatosRecibo): Promise<Blob> {
  const escala = 2; // nitidez en pantallas de alta densidad
  const W = 640;
  const padding = 44;

  // Filas a mostrar (label, value). Omitimos las vacías.
  const filas: [string, string][] = [];
  filas.push(["Cliente", d.cliente]);
  if (d.bancoDestino) filas.push(["Banco destino", d.bancoDestino]);
  if (d.cuenta) filas.push(["Cuenta / Tarjeta", d.cuenta]);
  if (d.referencia) filas.push(["Referencia", d.referencia]);
  filas.push(["Fecha", d.fecha]);

  const headerH = 132;
  const montoBloqueH = 120;
  const filaH = 58;
  const footerH = 96;
  const H = headerH + montoBloqueH + filas.length * filaH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * escala;
  canvas.height = H * escala;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(escala, escala);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Encabezado con degradado
  const grad = ctx.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, "#6d28d9");
  grad.addColorStop(1, "#db2777");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Mis Transferencias", padding, 58);
  ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("Comprobante de transferencia", padding, 90);

  // Monto destacado
  let y = headerH + 24;
  ctx.fillStyle = "#64748b";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("MONTO", padding, y + 6);
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 46px system-ui, sans-serif";
  ctx.fillText(d.montoStr, padding, y + 56);
  y = headerH + montoBloqueH;

  // Filas de datos
  ctx.textBaseline = "middle";
  for (const [label, value] of filas) {
    const cy = y + filaH / 2;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 15px system-ui, sans-serif";
    ctx.fillText(label, padding, cy);

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 17px system-ui, sans-serif";
    // Alinear el valor a la derecha
    ctx.textAlign = "right";
    const max = W - padding * 2 - 170;
    let txt = value;
    while (ctx.measureText(txt).width > max + 170 && txt.length > 4) {
      txt = txt.slice(0, -2);
    }
    ctx.fillText(txt, W - padding, cy);
    ctx.textAlign = "left";

    // Línea separadora
    ctx.strokeStyle = "#eef2f7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y + filaH);
    ctx.lineTo(W - padding, y + filaH);
    ctx.stroke();
    y += filaH;
  }
  ctx.textBaseline = "alphabetic";

  // Footer: estado + marca
  const badgeY = y + 26;
  const estadoTxt = d.reflejada ? "REFLEJADA" : "PENDIENTE";
  ctx.font = "700 15px system-ui, sans-serif";
  const tw = ctx.measureText(estadoTxt).width;
  const bw = tw + 32;
  ctx.fillStyle = d.reflejada ? "#dcfce7" : "#fef3c7";
  roundRect(ctx, padding, badgeY - 8, bw, 32, 16);
  ctx.fill();
  ctx.fillStyle = d.reflejada ? "#15803d" : "#b45309";
  ctx.fillText(estadoTxt, padding + 16, badgeY + 13);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Generado con Mis Transferencias", W - padding, badgeY + 13);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falló"))), "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
