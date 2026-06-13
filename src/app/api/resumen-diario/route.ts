import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { enviarRespaldoPorCorreo, enviarRespaldoADrive } from "@/lib/respaldo";
import { enviarWhatsapp } from "@/lib/whatsapp";

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

type Periodo = "dia" | "semana" | "mes";

// Inicio del día actual en horario de Ciudad de México (UTC-6), como instante UTC.
function inicioDiaMx(): Date {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() - 6 * 3_600_000);
  return new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate(), 6, 0, 0));
}

// Inicio del periodo (día/semana/mes) en horario de México, como instante UTC.
function inicioPeriodo(periodo: Periodo): Date {
  if (periodo === "semana") return new Date(inicioDiaMx().getTime() - 6 * 86_400_000);
  if (periodo === "mes") {
    const mx = new Date(Date.now() - 6 * 3_600_000);
    return new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), 1, 6, 0, 0));
  }
  return inicioDiaMx();
}

const TITULO: Record<Periodo, string> = {
  dia: "Resumen del día",
  semana: "Resumen de la semana",
  mes: "Resumen del mes",
};

async function construirResumen(periodo: Periodo): Promise<string> {
  const inicio = inicioPeriodo(periodo);
  const hace3Dias = new Date(Date.now() - 3 * 86_400_000);

  const [registros, pendientesAgg, atrasadas] = await Promise.all([
    prisma.transferencia.findMany({
      where: { deletedAt: null, createdAt: { gte: inicio } },
      select: { monto: true, moneda: true, estado: true },
    }),
    prisma.transferencia.groupBy({
      by: ["moneda"],
      where: { deletedAt: null, estado: "pendiente" },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.transferencia.count({
      where: { deletedAt: null, estado: "pendiente", fecha: { lte: hace3Dias } },
    }),
  ]);

  const fecha = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  // Totales de lo registrado en el periodo, por moneda y estado.
  const acc: Record<string, { pend: number; refl: number; n: number }> = {};
  for (const t of registros) {
    const m = (acc[t.moneda] ??= { pend: 0, refl: 0, n: 0 });
    m.n++;
    if (t.estado === "reflejada") m.refl += t.monto;
    else m.pend += t.monto;
  }

  const lineas: string[] = [];
  lineas.push(`📊 *${TITULO[periodo]}* · ${fecha}`);
  lineas.push("");
  if (registros.length === 0) {
    lineas.push("No se registraron movimientos en este periodo.");
  } else {
    lineas.push(`Movimientos: ${registros.length}`);
    for (const [moneda, m] of Object.entries(acc)) {
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

// Mensaje SOLO de atrasadas. Devuelve null si no hay (para no enviar nada).
async function construirAtrasadas(): Promise<string | null> {
  const hace3Dias = new Date(Date.now() - 3 * 86_400_000);
  const atrasadas = await prisma.transferencia.findMany({
    where: { deletedAt: null, estado: "pendiente", fecha: { lte: hace3Dias } },
    select: { monto: true, moneda: true, fecha: true, cliente: { select: { nombre: true } } },
    orderBy: { fecha: "asc" },
    take: 15,
  });
  if (atrasadas.length === 0) return null;

  const dias = (f: Date) => Math.floor((Date.now() - f.getTime()) / 86_400_000);
  const lineas: string[] = [];
  lineas.push(`⚠️ *Pendientes atrasadas* (${atrasadas.length})`);
  lineas.push("");
  for (const t of atrasadas) {
    lineas.push(
      `• ${fmt(t.monto, t.moneda)} — ${t.cliente?.nombre ?? "Sin cliente"} (${dias(t.fecha)} días)`,
    );
  }
  return lineas.join("\n");
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

  const sp = request.nextUrl.searchParams;
  const tipo = sp.get("tipo");
  const periodoParam = sp.get("periodo");
  const periodo: Periodo =
    periodoParam === "semana" || periodoParam === "mes" ? periodoParam : "dia";

  // Modo "solo atrasadas": si no hay atrasadas, no enviamos nada (evita spam).
  if (tipo === "atrasadas") {
    const texto = await construirAtrasadas();
    if (!texto) {
      return NextResponse.json({ ok: true, mensaje: "Sin atrasadas; no se envió nada." });
    }
    const r = await enviarWhatsapp(texto);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.detalle }, { status: 400 });
    return NextResponse.json({ ok: true, mensaje: texto });
  }

  const texto = await construirResumen(periodo);
  const r = await enviarWhatsapp(texto);

  // El cron semanal aprovecha para mandar también el respaldo. Intenta por correo
  // (Resend) y a Google Drive: usa lo que esté configurado, los dos si ambos lo
  // están. Así un solo cron hace resumen + respaldo.
  if (esCron && periodo === "semana") {
    await Promise.allSettled([enviarRespaldoPorCorreo(), enviarRespaldoADrive()]);
  }

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.detalle }, { status: 400 });
  }
  return NextResponse.json({ ok: true, mensaje: texto });
}
