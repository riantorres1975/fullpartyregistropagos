import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// Envía un resumen de los movimientos del día a UN número de WhatsApp, gratis,
// usando CallMeBot (no requiere API de paga). Lo dispara el Cron de Vercel una
// vez al día, y también se puede probar manualmente desde Ajustes (con sesión).
//
// Variables de entorno necesarias (en Vercel y en .env local):
//   CALLMEBOT_PHONE  -> tu número con lada, solo dígitos (ej. 5215512345678)
//   CALLMEBOT_APIKEY -> la apikey que te da CallMeBot al autorizar
//   CRON_SECRET      -> secreto para que solo el Cron pueda dispararlo

const fmt = (n: number, moneda = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda }).format(n);

// Inicio del día actual en horario de Ciudad de México (UTC-6), como instante UTC.
function inicioDiaMx(): Date {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() - 6 * 3_600_000);
  return new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate(), 6, 0, 0));
}

async function construirResumen(): Promise<string> {
  const inicio = inicioDiaMx();
  const hace3Dias = new Date(Date.now() - 3 * 86_400_000);

  const [registrosHoy, pendientesAgg, atrasadas] = await Promise.all([
    prisma.transferencia.findMany({
      where: { createdAt: { gte: inicio } },
      select: { monto: true, moneda: true, estado: true },
    }),
    prisma.transferencia.groupBy({
      by: ["moneda"],
      where: { estado: "pendiente" },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.transferencia.count({
      where: { estado: "pendiente", fecha: { lte: hace3Dias } },
    }),
  ]);

  const fecha = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(inicio.getTime() + 6 * 3_600_000));

  // Totales de lo registrado hoy, por moneda y estado.
  const hoy: Record<string, { pend: number; refl: number; n: number }> = {};
  for (const t of registrosHoy) {
    const m = (hoy[t.moneda] ??= { pend: 0, refl: 0, n: 0 });
    m.n++;
    if (t.estado === "reflejada") m.refl += t.monto;
    else m.pend += t.monto;
  }

  const lineas: string[] = [];
  lineas.push(`📊 *Resumen ${fecha}*`);
  lineas.push("");
  if (registrosHoy.length === 0) {
    lineas.push("Hoy no se registraron movimientos.");
  } else {
    lineas.push(`Movimientos de hoy: ${registrosHoy.length}`);
    for (const [moneda, m] of Object.entries(hoy)) {
      lineas.push(`• ${moneda}: ${m.n} reg.`);
      if (m.refl > 0) lineas.push(`   ✅ Reflejado: ${fmt(m.refl, moneda)}`);
      if (m.pend > 0) lineas.push(`   ⏳ Pendiente: ${fmt(m.pend, moneda)}`);
    }
  }
  lineas.push("");
  if (pendientesAgg.length > 0) {
    lineas.push("*Pendientes en total:*");
    for (const p of pendientesAgg) {
      lineas.push(`• ${p._count} en ${p.moneda} — ${fmt(p._sum.monto ?? 0, p.moneda)}`);
    }
  } else {
    lineas.push("Sin pendientes. 🎉");
  }
  if (atrasadas > 0) {
    lineas.push("");
    lineas.push(`⚠️ ${atrasadas} pendiente(s) con 3+ días sin reflejarse.`);
  }
  return lineas.join("\n");
}

async function enviarWhatsapp(texto: string): Promise<{ ok: boolean; detalle: string }> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    return { ok: false, detalle: "Falta configurar CALLMEBOT_PHONE / CALLMEBOT_APIKEY." };
  }
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const cuerpo = await res.text();
    if (!res.ok) return { ok: false, detalle: `CallMeBot respondió ${res.status}: ${cuerpo.slice(0, 200)}` };
    return { ok: true, detalle: "Enviado" };
  } catch {
    return { ok: false, detalle: "No se pudo contactar a CallMeBot." };
  }
}

export async function GET(request: NextRequest) {
  // Autorización: o viene del Cron de Vercel (Bearer CRON_SECRET), o es una
  // prueba manual desde la app (sesión iniciada).
  const cronSecret = process.env.CRON_SECRET;
  const esCron =
    !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!esCron) {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;
  }

  const texto = await construirResumen();
  const r = await enviarWhatsapp(texto);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.detalle }, { status: 400 });
  }
  return NextResponse.json({ ok: true, mensaje: texto });
}
