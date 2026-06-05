import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// GET /api/export/transferencias -> archivo CSV (abre en Excel)
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const sp = request.nextUrl.searchParams;
  const estado = sp.get("estado")?.trim();
  const clienteId = sp.get("clienteId")?.trim();
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");

  const where: Prisma.TransferenciaWhereInput = {};
  if (estado === "pendiente" || estado === "reflejada") where.estado = estado;
  if (clienteId) where.clienteId = clienteId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta + "T23:59:59");
  }

  const rows = await prisma.transferencia.findMany({
    where,
    orderBy: [{ cliente: { nombre: "asc" } }, { fecha: "desc" }],
    include: { cliente: { select: { nombre: true } } },
  });

  const headers = [
    "Fecha",
    "Cliente",
    "Monto",
    "Moneda",
    "Banco Origen",
    "Banco Destino",
    "Referencia",
    "Estado",
    "Observaciones",
  ];

  const lines = rows.map((t) =>
    [
      t.fecha.toISOString().slice(0, 10),
      t.cliente?.nombre ?? "",
      t.monto,
      t.moneda,
      t.bancoOrigen ?? "",
      t.bancoDestino ?? "",
      t.referencia ?? "",
      t.estado,
      t.observaciones ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  // BOM para que Excel respete los acentos.
  const csv = "﻿" + [headers.join(","), ...lines].join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transferencias-${fecha}.csv"`,
    },
  });
}
