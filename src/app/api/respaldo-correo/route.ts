import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { enviarRespaldoPorCorreo } from "@/lib/respaldo";

// GET /api/respaldo-correo -> envía el respaldo completo al correo configurado
// (Resend). Lo puede disparar el Cron de Vercel (Bearer CRON_SECRET) o una
// prueba manual desde Ajustes (con sesión iniciada).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const esCron =
    !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!esCron) {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;
  }

  const r = await enviarRespaldoPorCorreo();
  if (!r.ok) return NextResponse.json({ ok: false, error: r.detalle }, { status: 400 });
  return NextResponse.json({ ok: true, mensaje: r.detalle });
}
