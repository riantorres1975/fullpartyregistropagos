import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, invalidarCacheSesion } from "@/lib/guard";
import { createSession } from "@/lib/auth";

// POST /api/auth/cerrar-sesiones -> revoca la sesión en TODOS los dispositivos
// (incrementa tokenVersion) y renueva solo la de este dispositivo. Útil si se
// perdió un teléfono con la sesión abierta.
export async function POST() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: { tokenVersion: { increment: 1 } },
  });
  invalidarCacheSesion(user.id);
  await createSession({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  await prisma.auditLog.create({
    data: { accion: "editar", entidad: "sesion", entidadId: user.id, detalle: "cerrar_sesiones" },
  });

  return NextResponse.json({ ok: true });
}
