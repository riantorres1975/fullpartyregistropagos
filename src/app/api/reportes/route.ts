import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// GET /api/reportes -> TODAS las transferencias (con filtros opcionales)
// para la vista de impresión. Liviano: no carga comprobantes.
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const estado = sp.get("estado")?.trim();
  const clienteId = sp.get("clienteId")?.trim();
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");

  const where: Prisma.TransferenciaWhereInput = { deletedAt: null };
  if (estado === "pendiente" || estado === "reflejada") where.estado = estado;
  if (clienteId) where.clienteId = clienteId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta + "T23:59:59");
  }
  if (q) {
    where.OR = [
      { referencia: { contains: q, mode: "insensitive" } },
      { cliente: { nombre: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, agregado] = await Promise.all([
    prisma.transferencia.findMany({
      where,
      orderBy: [{ cliente: { nombre: "asc" } }, { fecha: "desc" }],
      select: {
        fecha: true,
        monto: true,
        moneda: true,
        bancoOrigen: true,
        bancoDestino: true,
        referencia: true,
        estado: true,
        clienteId: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.transferencia.groupBy({
      by: ["moneda", "estado"],
      where,
      _sum: { monto: true },
    }),
  ]);

  const resumen: Record<
    string,
    { pendiente: number; reflejada: number; total: number }
  > = {};
  for (const row of agregado) {
    const m = (resumen[row.moneda] ??= { pendiente: 0, reflejada: 0, total: 0 });
    const suma = row._sum.monto ?? 0;
    if (row.estado === "pendiente") m.pendiente += suma;
    if (row.estado === "reflejada") m.reflejada += suma;
    m.total += suma;
  }

  return NextResponse.json({
    generadoEn: new Date().toISOString(),
    total: items.length,
    resumen,
    items: items.map((t) => ({
      fecha: t.fecha,
      clienteId: t.clienteId ?? "",
      cliente: t.cliente?.nombre ?? "Sin cliente",
      monto: t.monto,
      moneda: t.moneda,
      bancoOrigen: t.bancoOrigen,
      bancoDestino: t.bancoDestino,
      referencia: t.referencia,
      estado: t.estado,
    })),
  });
}
