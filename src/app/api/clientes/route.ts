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
  const [clientes, txs] = await Promise.all([
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
    // Transferencias MXN (con fecha de registro) para el avance de metas.
    prisma.transferencia.findMany({
      where: { moneda: "MXN", clienteId: { not: null } },
      select: { clienteId: true, monto: true, estado: true, createdAt: true },
    }),
  ]);

  // Avance de la meta: cuenta SOLO transferencias registradas desde que se
  // fijó (createdAt >= metaDesde), así arranca de cero y no toma lo ya transferido.
  return NextResponse.json(
    clientes.map((c) => {
      const desde = c.metaDesde;
      let pendiente = 0;
      let reflejada = 0;
      if (c.metaMonto != null && desde) {
        for (const t of txs) {
          if (t.clienteId !== c.id || t.createdAt < desde) continue;
          if (t.estado === "reflejada") reflejada += t.monto;
          else pendiente += t.monto;
        }
      }
      return {
        id: c.id,
        nombre: c.nombre,
        alias: c.alias,
        notas: c.notas,
        meta: c.metaMonto,
        metaDesde: c.metaDesde,
        avance: { pendiente, reflejada },
        totalTransferencias: c._count.transferencias,
        cuentas: c.cuentas.map(serializeCuenta),
      };
    }),
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
