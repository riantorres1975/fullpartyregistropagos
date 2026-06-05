export type DatosRecibo = {
  monto?: number;
  referencia?: string;
  banco?: string;
  texto: string;
};

// Lee el texto de una imagen de recibo (OCR en el navegador) y trata de
// detectar monto, número de referencia y banco de origen. Todo es una
// sugerencia: el usuario puede corregir cualquier campo.
export async function analizarRecibo(
  dataUrl: string,
  onProgreso?: (p: number) => void,
): Promise<DatosRecibo> {
  const { createWorker, PSM } = (await import("tesseract.js")).default;
  // Assets auto-hospedados en /public/tesseract (ver scripts/copy-tesseract-assets.mjs).
  // workerBlobURL:false carga el worker como script del mismo origen (sin blob:),
  // para que la Content-Security-Policy siga restringida.
  const worker = await createWorker("spa", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgreso) {
        onProgreso(Math.round(m.progress * 100));
      }
    },
  });

  try {
    // PSM AUTO (3): segmentación automática de página. En pruebas con recibos
    // reales captura los montos grandes/aislados que otros modos descartan.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(dataUrl);
    const texto = data.text || "";
    return {
      monto: detectarMonto(texto),
      referencia: detectarReferencia(texto),
      banco: detectarBanco(texto),
      texto,
    };
  } finally {
    await worker.terminate();
  }
}

function aNumero(raw: string): number | null {
  const n = parseFloat(raw.replace(/\s/g, "").replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// --- MONTO ---------------------------------------------------------------
export function detectarMonto(texto: string): number | undefined {
  const lineas = texto.split(/\n+/);
  const clave = /(monto|importe|total|cantidad|transferid|envi)/i;
  const ignorar = /(comisi|saldo|disponible)/i;

  const conClave: number[] = [];
  const todos: number[] = [];

  for (const linea of lineas) {
    if (ignorar.test(linea)) continue;
    const montos: number[] = [];
    const agregar = (raw: string) => {
      const n = aNumero(raw);
      if (n !== null) montos.push(n);
    };
    // $ prefijado (a veces el OCR pierde el $, por eso hay más patrones abajo).
    for (const m of linea.matchAll(/\$\s?([\d][\d.,]*)/g)) agregar(m[1]);
    // Sufijo MXN.
    for (const m of linea.matchAll(/([\d][\d.,]*)\s?mxn\b/gi)) agregar(m[1]);
    // Separador de miles (5,876 ó 5,876.00): casi siempre es dinero, y sirve
    // cuando el OCR pierde el "$" (lo lee como "*", "S", etc.).
    for (const m of linea.matchAll(/\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)\b/g)) agregar(m[1]);
    if (!montos.length) continue;
    todos.push(...montos);
    if (clave.test(linea)) conClave.push(...montos);
  }

  const pool = (conClave.length ? conClave : todos).filter((n) => n > 0);
  return pool.length ? Math.max(...pool) : undefined;
}

// --- REFERENCIA ----------------------------------------------------------
function extraerToken(linea: string): string | undefined {
  const limpio = linea.replace(/[#:]/g, " ");
  const toks = limpio.match(/[A-Za-z0-9]{4,}/g) || [];
  const conDigito = toks
    .filter((t) => /\d/.test(t))
    .sort((a, b) => b.length - a.length);
  return conDigito[0];
}

export function detectarReferencia(texto: string): string | undefined {
  const lineas = texto.split(/\n+/);
  // En orden de prioridad
  const orden = [
    /referencia/i,
    /folio/i,
    /autoriz/i,
    /clave de rastreo|rastreo/i,
    /id de movimiento|movimiento/i,
    /operaci/i,
  ];

  for (const kw of orden) {
    for (let i = 0; i < lineas.length; i++) {
      if (!kw.test(lineas[i])) continue;
      const val = extraerToken(lineas[i]) || extraerToken(lineas[i + 1] || "");
      if (val) return val;
    }
  }

  // Respaldo: la secuencia de dígitos más larga (>= 6).
  const digitos = (texto.match(/\d{6,}/g) || []).sort((a, b) => b.length - a.length);
  return digitos[0];
}

// --- BANCO DE ORIGEN -----------------------------------------------------
const ALIAS: [RegExp, string][] = [
  [/banam[eo]x/, "Citibanamex"],
  [/bbva|bancomer|dimo/, "BBVA México"],
  [/guardadito/, "Banco Azteca"],
  [/santander/, "Santander"],
  [/banorte/, "Banorte"],
  [/hsbc/, "HSBC"],
  [/scotia/, "Scotiabank"],
  [/inbursa/, "Inbursa"],
  [/azteca/, "Banco Azteca"],
  [/mercado\s?pago/, "Mercado Pago"],
  [/spin|oxxo/, "Spin by OXXO"],
  [/coppel/, "BanCoppel"],
  [/nubank|\bnu\b/, "Nu (Nubank)"],
  [/klar/, "Klar"],
  [/ual[aá]/, "Ualá"],
  [/stori/, "Stori"],
  [/cuenca/, "Cuenca"],
  [/\balbo\b/, "Albo"],
  [/hey\s?banco/, "Hey Banco"],
  [/banregio/, "Banregio"],
  [/baj[ií]o/, "BanBajío"],
  [/banjercito/, "Banjercito"],
  [/bienestar/, "Banco del Bienestar"],
  [/rappi/, "RappiPay"],
  [/compartamos/, "Compartamos Banco"],
  [/multiva/, "Multiva"],
  [/cibanco/, "CIBanco"],
  [/famsa/, "Banco Famsa"],
  [/sabadell/, "Banco Sabadell"],
  [/fondeadora/, "Fondeadora"],
  [/afirme/, "Afirme"],
  [/invex/, "Invex"],
  [/mifel/, "Mifel"],
  [/actinver/, "Actinver"],
  [/intercam/, "Intercam"],
  [/\bstp\b/, "STP"],
  [/somos/, "Banco Azteca"],
];

export function detectarBanco(texto: string): string | undefined {
  const lower = texto.toLowerCase();

  // Devuelve el banco cuyo nombre aparece MÁS TEMPRANO en el texto. En los
  // comprobantes, el banco de ORIGEN se imprime antes que el de DESTINO
  // (casi siempre Spin by OXXO), así que el primero en aparecer es el origen.
  // Es más robusto que cortar por "destino/para" (esas palabras aparecen en
  // frases sueltas como "Para validarla" y rompían la detección).
  let mejor: string | undefined;
  let mejorIdx = Infinity;
  for (const [re, nombre] of ALIAS) {
    const m = lower.match(re);
    if (m && m.index !== undefined && m.index < mejorIdx) {
      mejorIdx = m.index;
      mejor = nombre;
    }
  }
  return mejor;
}
