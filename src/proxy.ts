import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Rutas públicas que no requieren sesión.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esPublica = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sesion = await verifySession(token);

  // Si ya tiene sesión y va al login, lo mandamos al inicio.
  if (sesion && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (esPublica) {
    return NextResponse.next();
  }

  // Sin sesión: APIs devuelven 401, páginas redirigen al login.
  if (!sesion) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protege todo excepto archivos estáticos y de Next, y los assets públicos
  // del OCR (Tesseract) auto-hospedados en /tesseract/ (no son sensibles y el
  // Web Worker debe poder cargarlos sin la redirección de login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|tesseract/).*)",
  ],
};
