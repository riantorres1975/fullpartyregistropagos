import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard -> totales para la pantalla de inicio
export async function GET() {
  // Inicio del mes de hace 5 meses (para 6 meses incluyendo el actual)
  const ahora = new Date();
  const inicio6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

  const [porEstado, porMoneda, totalClientes, ultimas, ultimosMeses] =
    await Promise.all([
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
      prisma.transferencia.findMany({
        where: { fecha: { gte: inicio6Meses } },
        select: { fecha: true, estado: true },
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

  // Serie de los últimos 6 meses (conteo por estado)
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const buckets: {
    clave: string;
    label: string;
    pendiente: number;
    reflejada: number;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.push({
      clave: `${d.getFullYear()}-${d.getMonth()}`,
      label: MESES[d.getMonth()],
      pendiente: 0,
      reflejada: 0,
    });
  }
  for (const t of ultimosMeses) {
    const f = new Date(t.fecha);
    const clave = `${f.getFullYear()}-${f.getMonth()}`;
    const b = buckets.find((x) => x.clave === clave);
    if (b) {
      if (t.estado === "reflejada") b.reflejada++;
      else b.pendiente++;
    }
  }
  const porMes = buckets.map(({ label, pendiente, reflejada }) => ({
    label,
    pendiente,
    reflejada,
  }));

  return NextResponse.json({
    pendientes,
    reflejadas,
    totalTransferencias: pendientes + reflejadas,
    totalClientes,
    totalesPorMoneda,
    porMes,
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
