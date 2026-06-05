"use client";

import { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";

// Configuración global de SWR (caché stale-while-revalidate):
// - keepPreviousData: al cambiar de filtro/página muestra lo anterior sin
//   parpadear mientras llega lo nuevo.
// - revalidateOnFocus: refresca al volver a la pestaña.
// - dedupingInterval: no repite la misma petición si ocurre en <15s.
// La caché vive en memoria durante la sesión de la SPA, así que volver a una
// pantalla ya visitada es instantáneo.
export default function SWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        keepPreviousData: true,
        dedupingInterval: 15000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
