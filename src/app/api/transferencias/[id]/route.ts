import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

const schema = z.object({
  fecha: z.string().optional(),
  clienteId: z.string().optional().nullable(),
  cuentaId: z.string().optional().nullable(),
  monto: z.number().positive().optional(),
  moneda: z.string().optional(),
  bancoOrigen: z.string().optional().nullable(),
  bancoDestino: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  estado: z.enum(["pendiente", "reflejada"]).optional(),
  observaciones: z.string().optional().nullable(),
  comprobante: z.string().max(8_000_000, "Comprobante demasiado grande").optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

// GET /api/transferencias/[id] -> registro completo (incluye comprobante)
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const t = await prisma.transferencia.findUnique({ where: { id } });
  if (!t) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json(t);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  await prisma.transferencia.update({
    where: { id },
    data: {
      ...(d.fecha ? { fecha: new Date(d.fecha) } : {}),
      ...(d.clienteId !== undefined ? { clienteId: d.clienteId || null } : {}),
      ...(d.cuentaId !== undefined ? { cuentaId: d.cuentaId || null } : {}),
      ...(d.monto !== undefined ? { monto: d.monto } : {}),
      ...(d.moneda ? { moneda: d.moneda } : {}),
      ...(d.bancoOrigen !== undefined ? { bancoOrigen: d.bancoOrigen || null } : {}),
      ...(d.bancoDestino !== undefined ? { bancoDestino: d.bancoDestino || null } : {}),
      ...(d.referencia !== undefined ? { referencia: d.referencia || null } : {}),
      ...(d.estado ? { estado: d.estado } : {}),
      ...(d.observaciones !== undefined ? { observaciones: d.observaciones || null } : {}),
      ...(d.comprobante !== undefined ? { comprobante: d.comprobante || null } : {}),
    },
  });
  await prisma.auditLog.create({
    data: { accion: "editar", entidad: "transferencia", entidadId: id },
  });
  return NextResponse.json({ ok: true });
}

// DELETE = mandar a la papelera (soft delete). No se borra de verdad; queda
// recuperable. El borrado definitivo se hace desde /api/papelera.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  await prisma.transferencia.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { accion: "eliminar", entidad: "transferencia", entidadId: id },
  });
  return NextResponse.json({ ok: true });
}
