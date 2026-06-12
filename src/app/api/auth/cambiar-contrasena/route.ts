import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, invalidarCacheSesion } from "@/lib/guard";
import { verifyPassword, hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  actual: z.string().min(1, "Escribe tu contraseña actual"),
  nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

// POST /api/auth/cambiar-contrasena -> cambia la contraseña del usuario logueado.
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { actual, nueva } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: auth.session.userId } });
  if (!user || !(await verifyPassword(actual, user.passwordHash))) {
    return NextResponse.json(
      { error: "La contraseña actual no es correcta" },
      { status: 400 },
    );
  }

  // Al cambiar la contraseña se incrementa tokenVersion: cualquier sesión
  // abierta en otro dispositivo (o una cookie robada) queda revocada.
  const actualizado = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(nueva), tokenVersion: { increment: 1 } },
  });
  invalidarCacheSesion(user.id);
  // Renueva la sesión de ESTE dispositivo para que el usuario siga dentro.
  await createSession({
    userId: actualizado.id,
    email: actualizado.email,
    tokenVersion: actualizado.tokenVersion,
  });
  await prisma.auditLog.create({
    data: { accion: "editar", entidad: "sesion", entidadId: user.id, detalle: "cambio_contrasena" },
  });

  return NextResponse.json({ ok: true });
}
