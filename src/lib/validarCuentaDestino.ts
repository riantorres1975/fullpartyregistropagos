import { prisma } from "@/lib/prisma";

export async function validarCuentaDestino(
  clienteId?: string | null,
  cuentaId?: string | null,
): Promise<string | null> {
  if (!clienteId) {
    return cuentaId ? "La cuenta seleccionada requiere un cliente." : null;
  }

  const cuentas = await prisma.cuentaBancaria.findMany({
    where: { clienteId },
    select: { id: true },
  });

  if (cuentaId && !cuentas.some((cuenta) => cuenta.id === cuentaId)) {
    return "La cuenta seleccionada no pertenece a este cliente.";
  }

  if (cuentas.length > 1 && !cuentaId) {
    return "Elige una cuenta destino para este cliente.";
  }

  return null;
}
