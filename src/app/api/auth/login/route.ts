import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { enviarWhatsapp } from "@/lib/whatsapp";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

// Anti-fuerza-bruta: máximo de intentos fallidos dentro de la ventana.
// Se cuenta en la BD (AuditLog) para que funcione en serverless, donde la
// memoria del proceso no persiste entre invocaciones.
const MAX_INTENTOS = 8;
const VENTANA_MIN = 15;

// Hash bcrypt de relleno: cuando el correo NO existe igualmente se compara
// contra esto, para que la respuesta tarde lo mismo que con un correo real
// (si no, un atacante podría adivinar qué correos existen midiendo tiempos).
const HASH_RELLENO = "$2b$12$vVGR16.pEkO8rIiXiS46Fuu1dJesKqPVAXmkDCc.17aAo9ddXuAy2";

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

  // Mensaje genérico para no revelar si el correo existe (y comparación de
  // relleno para que tampoco lo revele el tiempo de respuesta).
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? HASH_RELLENO);
  if (!user || !passwordOk) {
    // Registra el intento fallido para el conteo de fuerza bruta.
    await prisma.auditLog.create({
      data: { accion: "login_fallido", entidad: "sesion", detalle: email },
    });
    // Alerta de seguridad: al llegar EXACTAMENTE a 3 fallidos en la ventana se
    // avisa por WhatsApp (solo una vez por ventana, para no hacer spam). Se
    // espera el envío porque en serverless el proceso se congela al responder.
    if (fallidosRecientes + 1 === 3) {
      await enviarWhatsapp(
        `🚨 *Alerta de seguridad*\n\nHubo 3 intentos fallidos de entrar a Mis Transferencias en los últimos ${VENTANA_MIN} minutos.\n\nSi no fuiste tú, entra y usa "Cerrar sesión en otros dispositivos" en Ajustes, y considera cambiar tu contraseña.`,
      ).catch(() => {});
    }
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 },
    );
  }

  await createSession({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  await prisma.auditLog.create({
    data: { accion: "login", entidad: "sesion", entidadId: user.id },
  });

  return NextResponse.json({ ok: true, name: user.name });
}
