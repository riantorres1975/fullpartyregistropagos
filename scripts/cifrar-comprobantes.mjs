// Migración de una sola vez: cifra los comprobantes que quedaron guardados en
// claro (data URL) en la base de datos. Usa el MISMO algoritmo que src/lib/crypto.ts
// (AES-256-GCM, formato "iv:authTag:ciphertext" en base64).
//
// Uso:  node scripts/cifrar-comprobantes.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

// Carga simple de .env (solo las claves que necesitamos).
for (const linea of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = linea.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ALGORITHM = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
if (key.length !== 32) throw new Error("ENCRYPTION_KEY no es de 32 bytes");

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

const prisma = new PrismaClient();

const pendientes = await prisma.transferencia.findMany({
  where: { comprobante: { startsWith: "data:" } },
  select: { id: true, comprobante: true },
});

console.log(`Comprobantes en claro por cifrar: ${pendientes.length}`);
let n = 0;
for (const t of pendientes) {
  await prisma.transferencia.update({
    where: { id: t.id },
    data: { comprobante: encrypt(t.comprobante) },
  });
  n++;
  console.log(`  ✓ ${n}/${pendientes.length} (${t.id})`);
}

await prisma.$disconnect();
console.log(`Listo. ${n} comprobante(s) cifrado(s).`);
