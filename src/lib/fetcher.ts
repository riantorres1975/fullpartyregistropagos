// Fetcher compartido para SWR. Lanza error en respuestas no-OK para que
// SWR lo trate como fallo (y reintente/revalide según corresponda).
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar ${url}`);
  }
  return res.json() as Promise<T>;
}
