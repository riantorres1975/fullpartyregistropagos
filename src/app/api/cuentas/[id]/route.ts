import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/cuentas/[id]?reveal=1 -> devuelve el número COMPLETO descifrado.
// Solo se usa cuando el usuario pulsa "Mostrar". Queda registrado.
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const reveal = request.nextUrl.searchParams.get("reveal");
  if (!reveal) {
    return NextResponse.json({ error: "Parámetro reveal requerido" }, { status: 400 });
  }
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id } });
  if (!cuenta) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }
  await prisma.auditLog.create({
    data: { accion: "ver", entidad: "cuenta", entidadId: id, detalle: "reveal" },
  });
  return NextResponse.json({ numero: decrypt(cuenta.numeroCifrado) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.cuentaBancaria.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { accion: "eliminar", entidad: "cuenta", entidadId: id },
  });
  return NextResponse.json({ ok: true });
}
