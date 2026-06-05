import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

// Defensa en profundidad: además del proxy (middleware), cada handler de API
// comprueba la sesión por su cuenta. Así, si el matcher del proxy cambiara o
// fallara, los datos sensibles siguen protegidos.
//
// Uso:
//   const auth = await requireSession();
//   if ("error" in auth) return auth.error;
//   // ... auth.session disponible
export async function requireSession(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  return { session };
}
