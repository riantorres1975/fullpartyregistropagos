// Envío de mensajes de WhatsApp al número del dueño vía CallMeBot (gratis).
// Lo usan el resumen diario/semanal y las alertas de seguridad del login.
export async function enviarWhatsapp(
  texto: string,
): Promise<{ ok: boolean; detalle: string }> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    return { ok: false, detalle: "Falta configurar CALLMEBOT_PHONE / CALLMEBOT_APIKEY." };
  }
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const cuerpo = await res.text();
    if (!res.ok) {
      return { ok: false, detalle: `CallMeBot respondió ${res.status}: ${cuerpo.slice(0, 200)}` };
    }
    return { ok: true, detalle: "Enviado" };
  } catch {
    return { ok: false, detalle: "No se pudo contactar a CallMeBot." };
  }
}
