import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import {
  cifrarCampo,
  cifrarComprobante,
  last4,
} from "@/lib/crypto";
import { validarCuentaDestino } from "@/lib/validarCuentaDestino";

const transferenciaLoteSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida"),
  monto: z
    .number()
    .positive("Todos los montos deben ser mayores a 0")
    .max(999_999_999, "Monto fuera de rango")
    .transform((valor) => Math.round(valor * 100) / 100),
  moneda: z.string().min(1).max(10).default("MXN"),
  bancoOrigen: z.string().max(100).optional().nullable(),
  bancoDestino: z.string().max(100).optional().nullable(),
  referencia: z
    .string()
    .max(100, "Referencia demasiado larga")
    .optional()
    .nullable(),
  estado: z.enum(["pendiente", "reflejada"]).default("pendiente"),
  comprobante: z
    .string()
    .min(1, "Cada transferencia debe tener un comprobante")
    .max(8_000_000, "Comprobante demasiado grande"),
});

const loteSchema = z.object({
  clienteId: z.string().min(1, "El cliente es obligatorio").max(50),
  cuentaId: z.string().max(50).optional().nullable(),
  permitirDuplicados: z.boolean().optional(),
  transferencias: z
    .array(transferenciaLoteSchema)
    .min(1, "Agrega al menos un comprobante")
    .max(20, "Puedes guardar hasta 20 transferencias por lote"),
});

function rangoDia(fecha: string) {
  const dia = new Date(fecha);
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  return {
    inicio,
    fin: new Date(inicio.getTime() + 86_400_000),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = loteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const datos = parsed.data;
  const errorCuenta = await validarCuentaDestino(datos.clienteId, datos.cuentaId);
  if (errorCuenta) {
    return NextResponse.json({ error: errorCuenta }, { status: 400 });
  }

  if (!datos.permitirDuplicados) {
    const existentes = await prisma.transferencia.findMany({
      where: {
        deletedAt: null,
        clienteId: datos.clienteId,
        OR: datos.transferencias.map((item) => {
          const { inicio, fin } = rangoDia(item.fecha);
          return {
            fecha: { gte: inicio, lt: fin },
            monto: item.monto,
            moneda: item.moneda,
          };
        }),
      },
      select: { fecha: true, monto: true, moneda: true },
    });

    const indicesDuplicados = new Set<number>();
    const vistos = new Map<string, number>();

    datos.transferencias.forEach((item, index) => {
      const { inicio, fin } = rangoDia(item.fecha);
      if (
        existentes.some(
          (existente) =>
            existente.monto === item.monto &&
            existente.moneda === item.moneda &&
            existente.fecha >= inicio &&
            existente.fecha < fin,
        )
      ) {
        indicesDuplicados.add(index);
      }

      const llave = `${item.fecha.slice(0, 10)}|${item.moneda}|${item.monto.toFixed(2)}`;
      const anterior = vistos.get(llave);
      if (anterior !== undefined) {
        indicesDuplicados.add(anterior);
        indicesDuplicados.add(index);
      } else {
        vistos.set(llave, index);
      }
    });

    if (indicesDuplicados.size > 0) {
      return NextResponse.json(
        {
          duplicado: true,
          indices: [...indicesDuplicados].sort((a, b) => a - b),
          error:
            "Hay transferencias con el mismo cliente, monto y día. Revisa los comprobantes antes de continuar.",
        },
        { status: 409 },
      );
    }
  }

  const preparadas = datos.transferencias.map((item) => ({
    fecha: new Date(item.fecha),
    clienteId: datos.clienteId,
    cuentaId: datos.cuentaId || null,
    monto: item.monto,
    moneda: item.moneda,
    bancoOrigen: item.bancoOrigen || null,
    bancoDestino: item.bancoDestino || null,
    referencia: cifrarCampo(item.referencia),
    referenciaLast4: item.referencia ? last4(item.referencia) : null,
    estado: item.estado,
    comprobante: cifrarComprobante(item.comprobante),
  }));

  const ids = await prisma.$transaction(async (tx) => {
    const creadas: string[] = [];
    for (const item of preparadas) {
      const transferencia = await tx.transferencia.create({ data: item });
      creadas.push(transferencia.id);
    }
    await tx.auditLog.createMany({
      data: creadas.map((id) => ({
        accion: "crear_lote",
        entidad: "transferencia",
        entidadId: id,
      })),
    });
    return creadas;
  });

  return NextResponse.json({ cantidad: ids.length, ids }, { status: 201 });
}
