import { prisma } from "@/lib/prisma";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// GET /api/export/transferencias -> archivo CSV (abre en Excel)
export async function GET() {
  const rows = await prisma.transferencia.findMany({
    orderBy: { fecha: "desc" },
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
