import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt, last4 } from "@/lib/crypto";
import { serializeCuenta } from "@/lib/serializers";
import { requireSession } from "@/lib/guard";

const cuentaSchema = z.object({
  banco: z.string().min(1, "El banco es obligatorio"),
  tipo: z.enum(["cuenta", "tarjeta", "clabe"]),
  titular: z.string().optional().nullable(),
  numero: z.string().min(3, "Número inválido"),
});

const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  alias: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  cuentas: z.array(cuentaSchema).optional(),
});

// GET /api/clientes  -> lista de clientes con sus cuentas (enmascaradas)
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const [clientes, sumas] = await Promise.all([
    prisma.cliente.findMany({
      where: q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { alias: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { nombre: "asc" },
      include: { cuentas: true, _count: { select: { transferencias: true } } },
    }),
    // Avance de meta: suma de transferencias en MXN por cliente y estado.
    prisma.transferencia.groupBy({
      by: ["clienteId", "estado"],
      where: { moneda: "MXN", clienteId: { not: null } },
      _sum: { monto: true },
    }),
  ]);

  const avancePorCliente = new Map<
    string,
    { pendiente: number; reflejada: number }
  >();
  for (const s of sumas) {
    if (!s.clienteId) continue;
    const a = avancePorCliente.get(s.clienteId) ?? { pendiente: 0, reflejada: 0 };
    const suma = s._sum.monto ?? 0;
    if (s.estado === "pendiente") a.pendiente = suma;
    if (s.estado === "reflejada") a.reflejada = suma;
    avancePorCliente.set(s.clienteId, a);
  }

  return NextResponse.json(
    clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      alias: c.alias,
      notas: c.notas,
      meta: c.metaMonto,
      avance: avancePorCliente.get(c.id) ?? { pendiente: 0, reflejada: 0 },
      totalTransferencias: c._count.transferencias,
      cuentas: c.cuentas.map(serializeCuenta),
    })),
  );
}

// POST /api/clientes  -> crea cliente (y opcionalmente sus cuentas)
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { nombre, alias, notas, cuentas } = parsed.data;

  const cliente = await prisma.cliente.create({
    data: {
      nombre,
      alias: alias || null,
      notas: notas || null,
      cuentas: cuentas
        ? {
            create: cuentas.map((c) => ({
              banco: c.banco,
              tipo: c.tipo,
              titular: c.titular || null,
              numeroCifrado: encrypt(c.numero),
              last4: last4(c.numero),
            })),
          }
        : undefined,
    },
    include: { cuentas: true },
  });

  await prisma.auditLog.create({
    data: { accion: "crear", entidad: "cliente", entidadId: cliente.id, detalle: nombre },
  });

  return NextResponse.json(
    {
      id: cliente.id,
      nombre: cliente.nombre,
      alias: cliente.alias,
      notas: cliente.notas,
      cuentas: cliente.cuentas.map(serializeCuenta),
    },
    { status: 201 },
  );
}
