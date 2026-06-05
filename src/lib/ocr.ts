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
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(dataUrl, "spa", {
    // Assets auto-hospedados en /public/tesseract (ver scripts/copy-tesseract-assets.mjs).
    // Evita CDNs externos para que la Content-Security-Policy siga restringida.
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    // Carga el worker como script normal del mismo origen (no via blob:),
    // así la CSP no necesita abrir blob: en worker-src/script-src.
    workerBlobURL: false,
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

function aNumero(raw: string): number | null {
  const n = parseFloat(raw.replace(/\s/g, "").replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// --- MONTO ---------------------------------------------------------------
function detectarMonto(texto: string): number | undefined {
  const lineas = texto.split(/\n+/);
  const clave = /(monto|importe|total|cantidad|transferid|envi)/i;
  const ignorar = /(comisi|saldo|disponible)/i;

  const conClave: number[] = [];
  const todos: number[] = [];

  for (const linea of lineas) {
    if (ignorar.test(linea)) continue;
    const montos: number[] = [];
    for (const m of linea.matchAll(/\$\s?([\d][\d.,]*)/g)) {
      const n = aNumero(m[1]);
      if (n !== null) montos.push(n);
    }
    for (const m of linea.matchAll(/([\d][\d.,]*)\s?mxn\b/gi)) {
      const n = aNumero(m[1]);
      if (n !== null) montos.push(n);
    }
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

function detectarReferencia(texto: string): string | undefined {
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
  [/banamex/, "Citibanamex"],
  [/bbva|bancomer|dimo/, "BBVA México"],
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

function detectarBanco(texto: string): string | undefined {
  const lower = texto.toLowerCase();

  // Corta el texto antes de la sección de destino/beneficiario, para no
  // confundir el banco de ORIGEN con el de destino (casi siempre Spin).
  const corte = lower.search(/\b(destino|para|beneficiari)\b/);
  const origenTxt = corte >= 0 ? lower.slice(0, corte) : lower;

  for (const [re, nombre] of ALIAS) {
    if (re.test(origenTxt)) return nombre;
  }
  return undefined;
}
