import { BANCOS } from "@/lib/bancos";

export type DatosRecibo = {
  monto?: number;
  referencia?: string;
  banco?: string;
  texto: string;
};

// Lee el texto de una imagen de recibo (OCR en el navegador) y trata de
// detectar monto, número de referencia y banco. Todo es una sugerencia:
// el usuario puede corregir cualquier campo.
export async function analizarRecibo(
  dataUrl: string,
  onProgreso?: (p: number) => void,
): Promise<DatosRecibo> {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(dataUrl, "spa", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgreso) {
        onProgreso(Math.round(m.progress * 100));
      }
    },
  });

  const texto = data.text || "";
  return {
    monto: detectarMonto(texto),
    referencia: detectarReferencia(texto),
    banco: detectarBanco(texto),
    texto,
  };
}

function aNumero(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

const NUM = /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}|\d+/g;

function detectarMonto(texto: string): number | undefined {
  const lineas = texto.split(/\n+/);
  const claves = /(monto|importe|total|cantidad|pago|enviad|transfer)/i;

  const candidatos: number[] = [];
  for (const linea of lineas) {
    if (!claves.test(linea)) continue;
    const matches = linea.match(NUM);
    if (matches) {
      for (const m of matches) {
        const n = aNumero(m);
        if (!isNaN(n) && n > 0) candidatos.push(n);
      }
    }
  }
  if (candidatos.length) return Math.max(...candidatos);

  // Respaldo: el número con 2 decimales más grande de todo el texto.
  const conDecimales = (texto.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || []).map(aNumero);
  if (conDecimales.length) return Math.max(...conDecimales);

  return undefined;
}

function detectarReferencia(texto: string): string | undefined {
  const lineas = texto.split(/\n+/);
  const claves =
    /(referencia|folio|rastreo|autoriz|operaci|clave|n[uú]mero|no\.?|num\.?)/i;

  for (const linea of lineas) {
    if (!claves.test(linea)) continue;
    // secuencia de 4+ dígitos (o alfanumérica larga) después de la palabra clave
    const m = linea.match(/([A-Z0-9]{4,})\b/g);
    if (m) {
      // prioriza la secuencia más larga
      const mejor = m.sort((a, b) => b.length - a.length)[0];
      if (/\d/.test(mejor)) return mejor;
    }
  }

  // Respaldo: la secuencia de dígitos más larga (>= 6) del texto.
  const digitos = (texto.match(/\d{6,}/g) || []).sort((a, b) => b.length - a.length);
  return digitos[0];
}

function detectarBanco(texto: string): string | undefined {
  const t = texto.toLowerCase();
  for (const banco of BANCOS) {
    // usa la primera palabra significativa (ej. "BBVA", "Santander", "Saldazo")
    const token = banco
      .replace(/\(.*?\)/g, "")
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();
    if (token.length >= 3 && t.includes(token)) return banco;
  }
  return undefined;
}
