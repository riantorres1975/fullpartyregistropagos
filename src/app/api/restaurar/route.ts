import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

// POST /api/restaurar -> restaura registros de un respaldo JSON (el mismo
// formato que generan la descarga, el correo y Google Drive). Es un "upsert":
// lo que ya existe (mismo id) se actualiza, lo que no, se crea. NUNCA borra.
//
// El navegador manda los datos EN LOTES (Vercel limita el cuerpo a ~4.5 MB y
// un respaldo con comprobantes puede ser más grande). Cada lote puede traer
// clientes, cuentas y/o transferencias. Los campos cifrados se restauran tal
// cual: solo sirven con la misma ENCRYPTION_KEY (por eso el respaldo es seguro).

const fechaFlexible = z
  .union([z.string(), z.date()])
  .transform((v) => new Date(v))
  .refine((d) => !isNaN(d.getTime()), "Fecha inválida");
const fechaOpcional = fechaFlexible.nullable().optional();

const clienteSchema = z.object({
  id: z.string().min(1).max(50),
  nombre: z.string().max(200),
  alias: z.string().max(200).nullable().optional(),
  notas: z.string().max(10_000).nullable().optional(),
  whatsapp: z.string().max(500).nullable().optional(),
  metaMonto: z.number().nullable().optional(),
  metaDesde: fechaOpcional,
  deletedAt: fechaOpcional,
  createdAt: fechaFlexible.optional(),
});

const cuentaSchema = z.object({
  id: z.string().min(1).max(50),
  clienteId: z.string().min(1).max(50),
  banco: z.string().max(100),
  tipo: z.string().max(20),
  titular: z.string().max(200).nullable().optional(),
  numeroCifrado: z.string().max(1000),
  last4: z.string().max(10),
  createdAt: fechaFlexible.optional(),
});

const transferenciaSchema = z.object({
  id: z.string().min(1).max(50),
  fecha: fechaFlexible,
  clienteId: z.string().max(50).nullable().optional(),
  cuentaId: z.string().max(50).nullable().optional(),
  monto: z.number(),
  moneda: z.string().max(10),
  bancoOrigen: z.string().max(100).nullable().optional(),
  bancoDestino: z.string().max(100).nullable().optional(),
  referencia: z.string().max(1000).nullable().optional(),
  referenciaLast4: z.string().max(10).nullable().optional(),
  estado: z.string().max(20),
  observaciones: z.string().max(10_000).nullable().optional(),
  comprobante: z.string().max(12_000_000).nullable().optional(),
  deletedAt: fechaOpcional,
  createdAt: fechaFlexible.optional(),
});

const schema = z.object({
  clientes: z.array(clienteSchema).max(2000).optional(),
  cuentas: z.array(cuentaSchema).max(5000).optional(),
  transferencias: z.array(transferenciaSchema).max(5000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "El archivo no tiene el formato esperado" },
      { status: 400 },
    );
  }
  const { clientes = [], cuentas = [], transferencias = [] } = parsed.data;

  let nClientes = 0;
  let nCuentas = 0;
  let nTransferencias = 0;

  for (const c of clientes) {
    const data = {
      nombre: c.nombre,
      alias: c.alias ?? null,
      notas: c.notas ?? null,
      whatsapp: c.whatsapp ?? null,
      metaMonto: c.metaMonto ?? null,
      metaDesde: c.metaDesde ?? null,
      deletedAt: c.deletedAt ?? null,
    };
    await prisma.cliente.upsert({
      where: { id: c.id },
      update: data,
      create: { id: c.id, ...data, ...(c.createdAt ? { createdAt: c.createdAt } : {}) },
    });
    nClientes++;
  }

  for (const c of cuentas) {
    // Si el cliente dueño no existe (respaldo parcial), se omite la cuenta.
    const existeCliente = await prisma.cliente.findUnique({
      where: { id: c.clienteId },
      select: { id: true },
    });
    if (!existeCliente) continue;
    const data = {
      clienteId: c.clienteId,
      banco: c.banco,
      tipo: c.tipo,
      titular: c.titular ?? null,
      numeroCifrado: c.numeroCifrado,
      last4: c.last4,
    };
    await prisma.cuentaBancaria.upsert({
      where: { id: c.id },
      update: data,
      create: { id: c.id, ...data, ...(c.createdAt ? { createdAt: c.createdAt } : {}) },
    });
    nCuentas++;
  }

  for (const t of transferencias) {
    // Relaciones rotas (cliente/cuenta que no existen) se restauran sin ellas.
    const clienteOk = t.clienteId
      ? await prisma.cliente.findUnique({ where: { id: t.clienteId }, select: { id: true } })
      : null;
    const cuentaOk = t.cuentaId
      ? await prisma.cuentaBancaria.findUnique({ where: { id: t.cuentaId }, select: { id: true } })
      : null;
    const data = {
      fecha: t.fecha,
      clienteId: clienteOk ? t.clienteId! : null,
      cuentaId: cuentaOk ? t.cuentaId! : null,
      monto: t.monto,
      moneda: t.moneda,
      bancoOrigen: t.bancoOrigen ?? null,
      bancoDestino: t.bancoDestino ?? null,
      referencia: t.referencia ?? null,
      referenciaLast4: t.referenciaLast4 ?? null,
      estado: t.estado,
      observaciones: t.observaciones ?? null,
      comprobante: t.comprobante ?? null,
      deletedAt: t.deletedAt ?? null,
    };
    await prisma.transferencia.upsert({
      where: { id: t.id },
      update: data,
      create: { id: t.id, ...data, ...(t.createdAt ? { createdAt: t.createdAt } : {}) },
    });
    nTransferencias++;
  }

  await prisma.auditLog.create({
    data: {
      accion: "restaurar",
      entidad: "respaldo",
      detalle: `clientes:${nClientes} cuentas:${nCuentas} transferencias:${nTransferencias}`,
    },
  });

  return NextResponse.json({ ok: true, nClientes, nCuentas, nTransferencias });
}
