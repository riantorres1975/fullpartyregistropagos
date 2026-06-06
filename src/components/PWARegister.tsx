"use client";

import { useEffect } from "react";

// Registra el service worker y captura el evento de instalación del navegador
// para poder ofrecer un botón "Instalar app" desde Ajustes.
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    function onPrompt(e: Event) {
      e.preventDefault();
      (window as unknown as { __deferredInstall?: Event }).__deferredInstall = e;
      window.dispatchEvent(new Event("pwa-installable"));
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return null;
}
