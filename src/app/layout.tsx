import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: "#4c1d95",
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
        {children}
      </body>
    </html>
  );
}
