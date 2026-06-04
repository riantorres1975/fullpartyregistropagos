import crypto from "crypto";

// Cifrado de campos sensibles (números de cuenta, tarjetas, CLABE) con
// AES-256-GCM. La clave vive en la variable de entorno ENCRYPTION_KEY
// (32 bytes en base64) y NUNCA se guarda en la base de datos.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Falta ENCRYPTION_KEY en las variables de entorno. " +
        "Genérala con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe ser de 32 bytes (256 bits). Recibidos: ${key.length} bytes.`,
    );
  }
  return key;
}

/**
 * Cifra un texto. Devuelve "iv:authTag:ciphertext" en base64.
 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12); // 96 bits, recomendado para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Descifra un texto producido por encrypt().
 */
export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de dato cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Devuelve los últimos 4 caracteres (dígitos) de un número, ignorando
 * espacios y guiones. Se guardan en claro para poder enmascarar.
 */
export function last4(numero: string): string {
  const limpio = numero.replace(/[\s-]/g, "");
  return limpio.slice(-4);
}

/**
 * Enmascara un número mostrando solo los últimos 4 dígitos.
 * Ej: tarjeta -> "•••• •••• •••• 1234", cuenta -> "•••••• 5678".
 */
export function maskNumero(last: string, tipo: string): string {
  if (tipo === "tarjeta") {
    return `•••• •••• •••• ${last}`;
  }
  return `•••••••• ${last}`;
}
