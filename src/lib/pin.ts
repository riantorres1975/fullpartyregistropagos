// Utilidades del PIN de bloqueo rápido (conveniencia en el dispositivo).
// OJO: es un candado LOCAL del navegador, no seguridad del servidor. La sesión
// real sigue protegida por la cookie httpOnly y el login. Sirve para que, ya
// con sesión iniciada, nadie que tome tu teléfono abra la app sin el PIN.

export const PIN_HASH_KEY = "mt-pin-hash";
export const PIN_OK_KEY = "mt-pin-ok";

// Hash SHA-256 del PIN (con sal fija). Requiere contexto seguro (https/localhost).
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode("mt-pin:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function tienePin(): boolean {
  try {
    return !!localStorage.getItem(PIN_HASH_KEY);
  } catch {
    return false;
  }
}
