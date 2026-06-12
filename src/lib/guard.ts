import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Defensa en profundidad: además del proxy (middleware), cada handler de API
// comprueba la sesión por su cuenta. Así, si el matcher del proxy cambiara o
// fallara, los datos sensibles siguen protegidos.
//
// Además valida tokenVersion contra la BD: al cambiar la contraseña o "cerrar
// sesión en todos los dispositivos" se incrementa User.tokenVersion y las
// cookies viejas (p. ej. robadas) dejan de servir al instante.
//
// Uso:
//   const auth = await requireSession();
//   if ("error" in auth) return auth.error;
//   // ... auth.session disponible

// Pequeño caché en memoria (userId -> versión) para no consultar la BD en cada
// petición. 60 s de retraso máximo en aplicar una revocación es aceptable.
const cacheVersion = new Map<string, { v: number; hasta: number }>();
const CACHE_MS = 60_000;

async function versionActual(userId: string): Promise<number | null> {
  const hit = cacheVersion.get(userId);
  if (hit && hit.hasta > Date.now()) return hit.v;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  if (!user) return null;
  cacheVersion.set(userId, { v: user.tokenVersion, hasta: Date.now() + CACHE_MS });
  return user.tokenVersion;
}

/** Olvida la versión cacheada (tras revocar sesiones, para que aplique ya). */
export function invalidarCacheSesion(userId: string): void {
  cacheVersion.delete(userId);
}

export async function requireSession(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  const noAutorizado = () => ({
    error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
  });
  if (!session) return noAutorizado();

  const v = await versionActual(session.userId);
  if (v === null || v !== session.tokenVersion) return noAutorizado();

  return { session };
}
