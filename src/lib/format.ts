export function formatMonto(monto: number, moneda = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda,
  }).format(monto);
}

export function formatFecha(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// Pone el nombre en formato uniforme tipo "Nombre Propio": quita espacios de
// sobra y capitaliza cada palabra, dejando en minúscula los conectores
// (de, del, la, y, …) salvo cuando son la primera palabra.
export function formatNombre(nombre: string): string {
  const conectores = new Set([
    "de", "del", "la", "las", "los", "y", "e", "da", "do", "el",
  ]);
  return nombre
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((palabra, i) => {
      const lower = palabra.toLowerCase();
      if (i > 0 && conectores.has(lower)) return lower;
      // Conserva siglas cortas en mayúscula (SA, CV, RL…) típicas de empresas.
      if (
        palabra.length <= 2 &&
        palabra === palabra.toUpperCase() &&
        /[A-ZÁÉÍÓÚÑ]/.test(palabra)
      ) {
        return palabra;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

// Agrupa un número (cuenta/CLABE/tarjeta) en bloques de 4 dígitos para que
// sea fácil de leer, como en los bancos. Ej: "012180001261680354" ->
// "0121 8000 1261 6803 54".
export function agruparNumero(numero: string): string {
  const limpio = numero.replace(/\s+/g, "");
  // Si no son solo dígitos, lo devuelve tal cual (no arriesga romper formatos raros).
  if (!/^\d+$/.test(limpio)) return numero;
  return limpio.replace(/(.{4})/g, "$1 ").trim();
}
