import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las respuestas.
const securityHeaders = [
  // Evita que la app se incruste en un <iframe> de otro sitio (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // No adivinar el tipo MIME (evita ataques de "content sniffing").
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar la URL completa a sitios externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Forzar HTTPS durante 2 años (incluye subdominios).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Bloquear acceso a APIs del navegador que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // CSP: solo recursos del propio origen. 'unsafe-inline' es necesario para
  // los estilos de Tailwind y para los scripts inline de hidratación que
  // inyecta el App Router de Next (sin ellos, la app no carga). Aun así, se
  // bloquean scripts de orígenes externos y la incrustación en iframes.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
