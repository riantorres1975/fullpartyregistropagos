import { prisma } from "@/lib/prisma";

// Respaldo por correo usando Resend (gratis). Requiere dos variables de entorno:
//   RESEND_API_KEY -> la apikey de https://resend.com (plan gratis)
//   BACKUP_EMAIL   -> el correo donde quieres recibir el respaldo. DEBE ser el
//                     mismo con el que te registraste en Resend (así no hace
//                     falta verificar un dominio: se usa el remitente de prueba).

// Arma el respaldo COMPLETO (incluye cuentas cifradas, solo restaurable con la
// misma ENCRYPTION_KEY). Incluye también lo que está en la papelera.
export async function construirRespaldo() {
  const [clientes, cuentas, transferencias] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.cuentaBancaria.findMany(),
    prisma.transferencia.findMany(),
  ]);
  return {
    version: 1,
    generadoEn: new Date().toISOString(),
    nota: "Las cuentas están cifradas. Restaurable solo con la misma ENCRYPTION_KEY.",
    clientes,
    cuentas,
    transferencias,
  };
}

export async function enviarRespaldoPorCorreo(): Promise<{ ok: boolean; detalle: string }> {
  const apikey = process.env.RESEND_API_KEY;
  const to = process.env.BACKUP_EMAIL;
  if (!apikey || !to) {
    return { ok: false, detalle: "Falta configurar RESEND_API_KEY / BACKUP_EMAIL." };
  }

  const backup = await construirRespaldo();
  const json = JSON.stringify(backup, null, 2);
  const fecha = new Date().toISOString().slice(0, 10);
  const base64 = Buffer.from(json, "utf8").toString("base64");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apikey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mis Transferencias <onboarding@resend.dev>",
        to: [to],
        subject: `Respaldo Mis Transferencias · ${fecha}`,
        text:
          `Adjunto va el respaldo completo al ${fecha}.\n\n` +
          `Clientes: ${backup.clientes.length}\n` +
          `Cuentas: ${backup.cuentas.length}\n` +
          `Transferencias: ${backup.transferencias.length}\n\n` +
          `Guárdalo en lugar seguro. Solo se restaura con la misma clave de cifrado.`,
        attachments: [
          { filename: `backup-transferencias-${fecha}.json`, content: base64 },
        ],
      }),
    });
    if (!res.ok) {
      const cuerpo = await res.text();
      return { ok: false, detalle: `Resend respondió ${res.status}: ${cuerpo.slice(0, 200)}` };
    }
    return { ok: true, detalle: "Respaldo enviado por correo." };
  } catch {
    return { ok: false, detalle: "No se pudo contactar a Resend." };
  }
}
