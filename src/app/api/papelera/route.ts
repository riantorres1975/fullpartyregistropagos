import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// Papelera: lista, restaura y borra definitivamente transferencias y clientes
// que fueron "eliminados" (soft delete: deletedAt != null).

// GET /api/papelera -> elementos en la papelera (transferencias y clientes).
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const [transferencias, clientes] = await Promise.all([
    prisma.transferencia.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        fecha: true,
        monto: true,
        moneda: true,
        estado: true,
        referencia: true,
        deletedAt: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.cliente.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        nombre: true,
        deletedAt: true,
        _count: { select: { transferencias: true } },
      },
    }),
  ]);

  return NextResponse.json({
    transferencias: transferencias.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      monto: t.monto,
      moneda: t.moneda,
      estado: t.estado,
      referencia: t.referencia,
      deletedAt: t.deletedAt,
      cliente: t.cliente?.nombre ?? null,
    })),
    clientes: clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      deletedAt: c.deletedAt,
      totalTransferencias: c._count.transferencias,
    })),
  });
}

const accionSchema = z.object({
  tipo: z.enum(["transferencia", "cliente"]),
  id: z.string().min(1),
});

// POST /api/papelera -> restaurar (deletedAt = null).
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const parsed = accionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { tipo, id } = parsed.data;
  if (tipo === "transferencia") {
    await prisma.transferencia.update({ where: { id }, data: { deletedAt: null } });
  } else {
    await prisma.cliente.update({ where: { id }, data: { deletedAt: null } });
  }
  await prisma.auditLog.create({
    data: { accion: "editar", entidad: tipo, entidadId: id, detalle: "restaurado de papelera" },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/papelera?tipo=&id=  -> borrado DEFINITIVO (no recuperable).
// DELETE /api/papelera?tipo=all   -> vaciar toda la papelera.
export async function DELETE(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const sp = request.nextUrl.searchParams;
  const tipo = sp.get("tipo");
  const id = sp.get("id");

  if (tipo === "all") {
    await prisma.transferencia.deleteMany({ where: { deletedAt: { not: null } } });
    await prisma.cliente.deleteMany({ where: { deletedAt: { not: null } } });
    await prisma.auditLog.create({
      data: { accion: "eliminar", entidad: "papelera", detalle: "papelera vaciada" },
    });
    return NextResponse.json({ ok: true });
  }

  if ((tipo !== "transferencia" && tipo !== "cliente") || !id) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  if (tipo === "transferencia") {
    await prisma.transferencia.delete({ where: { id } });
  } else {
    await prisma.cliente.delete({ where: { id } });
  }
  await prisma.auditLog.create({
    data: { accion: "eliminar", entidad: tipo, entidadId: id, detalle: "borrado definitivo" },
  });
  return NextResponse.json({ ok: true });
}
