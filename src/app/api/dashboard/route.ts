import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// GET /api/dashboard -> totales para la pantalla de inicio
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // Inicio del mes de hace 5 meses (para 6 meses incluyendo el actual)
  const ahora = new Date();
  const inicio6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

  const [porEstado, porMoneda, totalClientes, ultimas, ultimosMeses, porBancoRaw, porClienteRaw] =
    await Promise.all([
      prisma.transferencia.groupBy({ by: ["estado"], where: { deletedAt: null }, _count: true }),
      prisma.transferencia.groupBy({
        by: ["moneda", "estado"],
        where: { deletedAt: null },
        _sum: { monto: true },
      }),
      prisma.cliente.count({ where: { deletedAt: null } }),
      prisma.transferencia.findMany({
        where: { deletedAt: null },
        orderBy: { fecha: "desc" },
        take: 5,
        include: { cliente: { select: { nombre: true } } },
      }),
      prisma.transferencia.findMany({
        where: { deletedAt: null, fecha: { gte: inicio6Meses } },
        select: { fecha: true, estado: true, monto: true, moneda: true },
      }),
      // Totales por banco destino (MXN), para ver a dónde se manda más.
      prisma.transferencia.groupBy({
        by: ["bancoDestino"],
        where: { deletedAt: null, moneda: "MXN", bancoDestino: { not: null } },
        _sum: { monto: true },
        _count: true,
      }),
      // Totales por cliente (MXN), para ver quién mueve más.
      prisma.transferencia.groupBy({
        by: ["clienteId"],
        where: { deletedAt: null, moneda: "MXN", clienteId: { not: null } },
        _sum: { monto: true },
        _count: true,
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
    montoMXN: number;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.push({
      clave: `${d.getFullYear()}-${d.getMonth()}`,
      label: MESES[d.getMonth()],
      pendiente: 0,
      reflejada: 0,
      montoMXN: 0,
    });
  }
  for (const t of ultimosMeses) {
    const f = new Date(t.fecha);
    const clave = `${f.getFullYear()}-${f.getMonth()}`;
    const b = buckets.find((x) => x.clave === clave);
    if (b) {
      if (t.estado === "reflejada") b.reflejada++;
      else b.pendiente++;
      if (t.moneda === "MXN") b.montoMXN += t.monto;
    }
  }
  const porMes = buckets.map(({ label, pendiente, reflejada, montoMXN }) => ({
    label,
    pendiente,
    reflejada,
    montoMXN,
  }));

  // Top bancos destino por monto (MXN), de mayor a menor (máx. 6).
  const porBanco = porBancoRaw
    .map((b) => ({
      banco: b.bancoDestino ?? "Sin banco",
      total: b._sum.monto ?? 0,
      cuenta: b._count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Top clientes por monto (MXN). Resolvemos los nombres de los más altos.
  const topClienteIds = porClienteRaw
    .map((c) => ({ id: c.clienteId as string, total: c._sum.monto ?? 0, n: c._count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const nombresClientes = await prisma.cliente.findMany({
    where: { id: { in: topClienteIds.map((c) => c.id) } },
    select: { id: true, nombre: true },
  });
  const mapaNombres = new Map(nombresClientes.map((c) => [c.id, c.nombre]));
  const porCliente = topClienteIds.map((c) => ({
    cliente: mapaNombres.get(c.id) ?? "Sin cliente",
    total: c.total,
    cuenta: c.n,
  }));

  return NextResponse.json({
    pendientes,
    reflejadas,
    totalTransferencias: pendientes + reflejadas,
    totalClientes,
    totalesPorMoneda,
    porMes,
    porBanco,
    porCliente,
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
