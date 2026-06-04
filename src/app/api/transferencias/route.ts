import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maskNumero } from "@/lib/crypto";

const schema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  clienteId: z.string().optional().nullable(),
  cuentaId: z.string().optional().nullable(),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  moneda: z.string().default("MXN"),
  bancoOrigen: z.string().optional().nullable(),
  bancoDestino: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  estado: z.enum(["pendiente", "reflejada"]).default("pendiente"),
  observaciones: z.string().optional().nullable(),
  comprobante: z.string().optional().nullable(),
});

// GET /api/transferencias?q=&estado=&desde=&hasta=&page=&pageSize=
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const estado = sp.get("estado")?.trim();
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10) || 25));

  const where: Prisma.TransferenciaWhereInput = {};
  if (estado === "pendiente" || estado === "reflejada") where.estado = estado;
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

  const [total, items, agregado] = await Promise.all([
    prisma.transferencia.count({ where }),
    prisma.transferencia.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        cliente: { select: { id: true, nombre: true } },
        cuenta: { select: { id: true, banco: true, tipo: true, last4: true } },
      },
    }),
    // Totales del listado filtrado completo (no solo la página actual)
    prisma.transferencia.groupBy({
      by: ["moneda", "estado"],
      where,
      _sum: { monto: true },
      _count: true,
    }),
  ]);

  // Arma el resumen por moneda separando pendiente/reflejada.
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
    total,
    page,
    pageSize,
    resumen,
    items: items.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      monto: t.monto,
      moneda: t.moneda,
      estado: t.estado,
      referencia: t.referencia,
      bancoOrigen: t.bancoOrigen,
      bancoDestino: t.bancoDestino,
      observaciones: t.observaciones,
      tieneComprobante: !!t.comprobante,
      cliente: t.cliente,
      clienteId: t.clienteId,
      cuentaId: t.cuentaId,
      cuenta: t.cuenta
        ? {
            id: t.cuenta.id,
            banco: t.cuenta.banco,
            enmascarado: maskNumero(t.cuenta.last4, t.cuenta.tipo),
          }
        : null,
    })),
  });
}

// POST /api/transferencias
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const t = await prisma.transferencia.create({
    data: {
      fecha: new Date(d.fecha),
      clienteId: d.clienteId || null,
      cuentaId: d.cuentaId || null,
      monto: d.monto,
      moneda: d.moneda,
      bancoOrigen: d.bancoOrigen || null,
      bancoDestino: d.bancoDestino || null,
      referencia: d.referencia || null,
      estado: d.estado,
      observaciones: d.observaciones || null,
      comprobante: d.comprobante || null,
    },
  });
  await prisma.auditLog.create({
    data: { accion: "crear", entidad: "transferencia", entidadId: t.id },
  });
  return NextResponse.json({ id: t.id }, { status: 201 });
}
