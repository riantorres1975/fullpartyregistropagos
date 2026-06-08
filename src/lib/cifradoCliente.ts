// Cifrado/descifrado en el NAVEGADOR con una contraseña que el usuario elige.
// Sirve para exportar un respaldo extra protegido por contraseña (además del
// cifrado de las cuentas). Usa PBKDF2 (deriva la clave) + AES-256-GCM.
// El archivo resultante es un JSON: { v, salt, iv, data } en base64.

const enc = new TextEncoder();
const dec = new TextDecoder();

function aB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function deB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derivarClave(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function cifrarTexto(texto: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await derivarClave(password, salt);
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    clave,
    enc.encode(texto),
  );
  return JSON.stringify({
    v: 1,
    salt: aB64(salt.buffer),
    iv: aB64(iv.buffer),
    data: aB64(cifrado),
  });
}

export async function descifrarTexto(archivo: string, password: string): Promise<string> {
  let obj: { salt: string; iv: string; data: string };
  try {
    obj = JSON.parse(archivo);
  } catch {
    throw new Error("El archivo no tiene el formato esperado.");
  }
  if (!obj.salt || !obj.iv || !obj.data) {
    throw new Error("El archivo no es un respaldo cifrado válido.");
  }
  const clave = await derivarClave(password, deB64(obj.salt));
  const plano = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deB64(obj.iv) as BufferSource },
    clave,
    deB64(obj.data) as BufferSource,
  );
  return dec.decode(plano);
}
