import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const brand = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

const text = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mis Transferencias · Full Party",
  description: "Sistema seguro de registro de transferencias",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Transferencias",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // La franja del sistema (arriba) toma el morado del header para que se funda
  // con él (estilo Spin), en modo claro y oscuro.
  themeColor: "#3b1578",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${brand.variable} ${text.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f4f1ec] text-[#1c1830] dark:bg-[#0e0c15] dark:text-slate-100">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
