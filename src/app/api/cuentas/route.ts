import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt, last4 } from "@/lib/crypto";
import { serializeCuenta } from "@/lib/serializers";
import { requireSession } from "@/lib/guard";

const schema = z.object({
  clienteId: z.string().min(1),
  banco: z.string().min(1, "El banco es obligatorio"),
  tipo: z.enum(["cuenta", "tarjeta", "clabe"]),
  titular: z.string().optional().nullable(),
  numero: z.string().min(3, "Número inválido"),
});

// POST /api/cuentas -> agrega una cuenta/tarjeta a un cliente
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { clienteId, banco, tipo, titular, numero } = parsed.data;

  const cuenta = await prisma.cuentaBancaria.create({
    data: {
      clienteId,
      banco,
      tipo,
      titular: titular || null,
      numeroCifrado: encrypt(numero),
      last4: last4(numero),
    },
  });

  await prisma.auditLog.create({
    data: { accion: "crear", entidad: "cuenta", entidadId: cuenta.id, detalle: banco },
  });

  return NextResponse.json(serializeCuenta(cuenta), { status: 201 });
}
