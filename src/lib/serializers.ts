import { maskNumero } from "@/lib/crypto";

type CuentaRow = {
  id: string;
  banco: string;
  tipo: string;
  titular: string | null;
  last4: string;
};

/** Convierte una cuenta de la BD a la forma segura que ve el cliente. */
export function serializeCuenta(c: CuentaRow) {
  return {
    id: c.id,
    banco: c.banco,
    tipo: c.tipo,
    titular: c.titular,
    last4: c.last4,
    enmascarado: maskNumero(c.last4, c.tipo),
  };
}
