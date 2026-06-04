import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard -> totales para la pantalla de inicio
export async function GET() {
  const [porEstado, porMoneda, totalClientes, ultimas] = await Promise.all([
    prisma.transferencia.groupBy({ by: ["estado"], _count: true }),
    prisma.transferencia.groupBy({
      by: ["moneda", "estado"],
      _sum: { monto: true },
    }),
    prisma.cliente.count(),
    prisma.transferencia.findMany({
      orderBy: { fecha: "desc" },
      take: 5,
      include: { cliente: { select: { nombre: true } } },
    }),
  ]);

  const pendientes = porEstado.find((e) => e.estado === "pendiente")?._count ?? 0;
  const reflejadas = porEstado.find((e) => e.estado === "reflejada")?._count ?? 0;

  // Totales por moneda separando pendiente/reflejada
  const totalesPorMoneda: Record<
    string,
    { pendiente: number; reflejada: number }
  > = {};
  for (const row of porMoneda) {
    const m = (totalesPorMoneda[row.moneda] ??= { pendiente: 0, reflejada: 0 });
    if (row.estado === "pendiente") m.pendiente = row._sum.monto ?? 0;
    if (row.estado === "reflejada") m.reflejada = row._sum.monto ?? 0;
  }

  return NextResponse.json({
    pendientes,
    reflejadas,
    totalTransferencias: pendientes + reflejadas,
    totalClientes,
    totalesPorMoneda,
    ultimas: ultimas.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      monto: t.monto,
      moneda: t.moneda,
      estado: t.estado,
      cliente: t.cliente?.nombre ?? null,
    })),
  });
}
