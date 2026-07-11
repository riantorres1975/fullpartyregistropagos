import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import {
  cifrarComprobante,
  descifrarComprobante,
  cifrarCampo,
  descifrarCampo,
  last4,
} from "@/lib/crypto";
import { validarCuentaDestino } from "@/lib/validarCuentaDestino";

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida").optional(),
  clienteId: z.string().max(50).optional().nullable(),
  cuentaId: z.string().max(50).optional().nullable(),
  monto: z
    .number()
    .positive()
    .max(999_999_999, "Monto fuera de rango")
    .transform((v) => Math.round(v * 100) / 100)
    .optional(),
  moneda: z.string().max(10).optional(),
  bancoOrigen: z.string().max(100).optional().nullable(),
  bancoDestino: z.string().max(100).optional().nullable(),
  referencia: z.string().max(100, "Referencia demasiado larga").optional().nullable(),
  estado: z.enum(["pendiente", "reflejada"]).optional(),
  observaciones: z.string().max(2000, "Observaciones demasiado largas").optional().nullable(),
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
  // Los campos sensibles se guardan cifrados; se descifran solo aquí.
  return NextResponse.json({
    ...t,
    referencia: descifrarCampo(t.referencia),
    observaciones: descifrarCampo(t.observaciones),
    comprobante: t.comprobante ? descifrarComprobante(t.comprobante) : null,
  });
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

  if (d.clienteId !== undefined || d.cuentaId !== undefined) {
    const actual = await prisma.transferencia.findUnique({
      where: { id },
      select: { clienteId: true, cuentaId: true },
    });
    if (!actual) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const clienteId = d.clienteId !== undefined ? d.clienteId : actual.clienteId;
    const cuentaId = d.cuentaId !== undefined ? d.cuentaId : actual.cuentaId;
    const errorCuenta = await validarCuentaDestino(clienteId, cuentaId);
    if (errorCuenta) {
      return NextResponse.json({ error: errorCuenta }, { status: 400 });
    }
  }
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
      ...(d.referencia !== undefined
        ? {
            referencia: cifrarCampo(d.referencia),
            referenciaLast4: d.referencia ? last4(d.referencia) : null,
          }
        : {}),
      ...(d.estado ? { estado: d.estado } : {}),
      ...(d.observaciones !== undefined ? { observaciones: cifrarCampo(d.observaciones) } : {}),
      ...(d.comprobante !== undefined
        ? { comprobante: d.comprobante ? cifrarComprobante(d.comprobante) : null }
        : {}),
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
