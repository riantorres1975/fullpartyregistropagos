import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

// Anti-fuerza-bruta: máximo de intentos fallidos dentro de la ventana.
// Se cuenta en la BD (AuditLog) para que funcione en serverless, donde la
// memoria del proceso no persiste entre invocaciones.
const MAX_INTENTOS = 8;
const VENTANA_MIN = 15;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // ¿Demasiados intentos fallidos recientes? -> 429 (Too Many Requests).
  const desde = new Date(Date.now() - VENTANA_MIN * 60_000);
  const fallidosRecientes = await prisma.auditLog.count({
    where: { accion: "login_fallido", createdAt: { gte: desde } },
  });
  if (fallidosRecientes >= MAX_INTENTOS) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Espera ${VENTANA_MIN} minutos e intenta de nuevo.`,
      },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mensaje genérico para no revelar si el correo existe.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Registra el intento fallido para el conteo de fuerza bruta.
    await prisma.auditLog.create({
      data: { accion: "login_fallido", entidad: "sesion", detalle: email },
    });
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 },
    );
  }

  await createSession({ userId: user.id, email: user.email });
  await prisma.auditLog.create({
    data: { accion: "login", entidad: "sesion", entidadId: user.id },
  });

  return NextResponse.json({ ok: true, name: user.name });
}
