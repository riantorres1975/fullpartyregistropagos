import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// GET /api/backup -> respaldo COMPLETO en JSON (descargable).
// Las cuentas/tarjetas se incluyen CIFRADAS: el respaldo solo es
// restaurable con la misma ENCRYPTION_KEY. No expone datos sensibles.
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const [clientes, cuentas, transferencias] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.cuentaBancaria.findMany(),
    prisma.transferencia.findMany(),
  ]);

  const backup = {
    version: 1,
    generadoEn: new Date().toISOString(),
    nota: "Las cuentas están cifradas. Restaurable solo con la misma ENCRYPTION_KEY.",
    clientes,
    cuentas,
    transferencias,
  };

  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-transferencias-${fecha}.json"`,
    },
  });
}
