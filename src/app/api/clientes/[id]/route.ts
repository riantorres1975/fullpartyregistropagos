import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeCuenta } from "@/lib/serializers";
import { requireSession } from "@/lib/guard";
import { formatNombre } from "@/lib/format";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  alias: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  // Meta de transferencia en MXN. número positivo para fijarla, null para quitarla.
  metaMonto: z.number().positive("La meta debe ser mayor a 0").nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { cuentas: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  return NextResponse.json({
    id: cliente.id,
    nombre: cliente.nombre,
    alias: cliente.alias,
    notas: cliente.notas,
    cuentas: cliente.cuentas.map(serializeCuenta),
  });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { metaMonto, ...resto } = parsed.data;
  const data: Prisma.ClienteUpdateInput = { ...resto };
  if (typeof resto.nombre === "string") data.nombre = formatNombre(resto.nombre);

  // Manejo de la meta: al FIJARLA por primera vez se marca "metaDesde" = ahora,
  // para que el avance arranque de cero (no cuente lo ya transferido). Al
  // editar solo el monto se conserva la fecha; al quitarla se limpian ambos.
  if (metaMonto !== undefined) {
    if (metaMonto === null) {
      data.metaMonto = null;
      data.metaDesde = null;
    } else {
      data.metaMonto = metaMonto;
      const actual = await prisma.cliente.findUnique({
        where: { id },
        select: { metaDesde: true },
      });
      if (!actual?.metaDesde) data.metaDesde = new Date();
    }
  }

  const cliente = await prisma.cliente.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { accion: "editar", entidad: "cliente", entidadId: id, detalle: cliente.nombre },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  await prisma.cliente.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { accion: "eliminar", entidad: "cliente", entidadId: id },
  });
  return NextResponse.json({ ok: true });
}
