import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// GET /api/actividad -> últimos movimientos del registro de auditoría, para la
// tarjeta "Actividad reciente" de Ajustes. Solo lectura.
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const eventos = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, accion: true, entidad: true, detalle: true, createdAt: true },
  });

  return NextResponse.json({ eventos });
}
