import type { MetadataRoute } from "next";

// Manifest de la PWA: permite "Instalar app" / "Agregar a inicio" y abrirla
// a pantalla completa como una app nativa. Next lo sirve en /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Transferencias · Full Party",
    short_name: "Transferencias",
    description: "Registro seguro de transferencias",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0c15",
    theme_color: "#6d28d9",
    lang: "es-MX",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
