// Migración de una sola vez (idempotente): cifra los campos sensibles que
// estaban en claro y rellena referenciaLast4. Mismo algoritmo que src/lib/crypto.ts.
//
// Uso:  node scripts/cifrar-campos.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

for (const linea of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = linea.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ALGORITHM = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
if (key.length !== 32) throw new Error("ENCRYPTION_KEY no es de 32 bytes");

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}
function decrypt(payload) {
  const [iv, tag, data] = payload.split(":");
  const d = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
// ¿El valor ya está cifrado? (se puede descifrar => sí)
function esCifrado(v) {
  try { decrypt(v); return true; } catch { return false; }
}
function last4(v) {
  return String(v).replace(/[\s-]/g, "").slice(-4);
}

const prisma = new PrismaClient();
let ref = 0, obs = 0, wa = 0, nt = 0;

// ── Transferencias: referencia (+last4) y observaciones ──────────────────────
const txs = await prisma.transferencia.findMany({
  select: { id: true, referencia: true, referenciaLast4: true, observaciones: true },
});
for (const t of txs) {
  const data = {};
  if (t.referencia && !esCifrado(t.referencia)) {
    data.referencia = encrypt(t.referencia);
    data.referenciaLast4 = last4(t.referencia);
    ref++;
  } else if (t.referencia && esCifrado(t.referencia) && !t.referenciaLast4) {
    // Ya cifrada pero sin last4 (caso raro): lo calculamos descifrando.
    data.referenciaLast4 = last4(decrypt(t.referencia));
  }
  if (t.observaciones && !esCifrado(t.observaciones)) {
    data.observaciones = encrypt(t.observaciones);
    obs++;
  }
  if (Object.keys(data).length) await prisma.transferencia.update({ where: { id: t.id }, data });
}

// ── Clientes: whatsapp y notas ───────────────────────────────────────────────
const clientes = await prisma.cliente.findMany({
  select: { id: true, whatsapp: true, notas: true },
});
for (const c of clientes) {
  const data = {};
  if (c.whatsapp && !esCifrado(c.whatsapp)) { data.whatsapp = encrypt(c.whatsapp); wa++; }
  if (c.notas && !esCifrado(c.notas)) { data.notas = encrypt(c.notas); nt++; }
  if (Object.keys(data).length) await prisma.cliente.update({ where: { id: c.id }, data });
}

await prisma.$disconnect();
console.log(`Listo. referencia: ${ref}, observaciones: ${obs}, whatsapp: ${wa}, notas: ${nt}`);
