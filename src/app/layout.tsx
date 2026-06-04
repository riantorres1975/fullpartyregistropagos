import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mis Transferencias · Full Party",
  description: "Sistema seguro de registro de transferencias",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#667eea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-800">
        {children}
      </body>
    </html>
  );
}
