# 📋 Cambios y pendientes · Mis Transferencias

Bitácora de lo que se ha implementado y lo que falta. La app está **desplegada y en
uso** en https://fullpartyregistropagos.vercel.app (Vercel + Neon; cada push a `main`
redespliega solo).

---

## ✅ Implementado

### Base (lanzamiento)
- Login con bcrypt + sesión JWT en cookie httpOnly; protección de rutas.
- Cifrado AES-256-GCM de números de cuenta/tarjeta/CLABE (solo `last4` en claro).
- Clientes con cuentas guardadas (enmascaradas, con botón "Mostrar" auditado).
- Transferencias: registro, filtros, estados, edición, borrado, paginación.
- Dashboard (totales por moneda, últimas), reportes (Excel/CSV, respaldo JSON, imprimir).
- Auditoría de acciones.

### Mejoras posteriores
- Selector de cuenta/tarjeta del cliente al registrar una transferencia.
- UX: buscador de cliente con autocompletado, autoselección de cuenta única, toasts,
  barra de totales por moneda, formulario plegable.
- Modo oscuro + gráfica de transferencias por mes en el Inicio.
- Buscador de bancos con más opciones (incluye OXXO).
- Comprobante por foto + **OCR** (monto, referencia, banco), afinado con recibos reales.
- Optimización para **móvil** en todas las pantallas.
- Reporte imprimible **agrupado por cliente** con subtotales y total general; filtros
  por cliente/estado/fecha; resumen en vivo en Reportes.
- Formato uniforme de nombres y números; botón **Copiar** datos de cuenta.
- **Metas** por cliente con barra de avance (arranca de cero al fijarse).
- Navegación más rápida con **SWR** (caché) y esqueletos de carga.
- Endurecimiento de seguridad: rate-limit en login, `requireSession()` en toda la API,
  cabeceras de seguridad (CSP, HSTS, etc.), límite de tamaño del comprobante.
- Todos los **emojis reemplazados por iconos SVG**; comprobantes en **WebP**.

### Lote del 2026-06-06
- Separar claramente **buscar** de **agregar** cliente (alta plegable + buscador con lupa).
- **Autodetección** del tipo de cuenta al teclear (CLABE 18 / tarjeta 15–16 / cuenta).
- **WhatsApp del cliente**: campo editable + botón que abre el chat con los datos escritos.
- **Ver movimientos** por cliente (`/transferencias?cliente=ID`).
- **Totales por banco destino** en el Inicio.
- **Duplicar** transferencia (prefija el formulario).
- **Aviso de pendientes atrasadas** (3+ días).
- **Marcar reflejada de un toque** también desde el Inicio.
- **PWA instalable** (manifest, iconos, service worker que NO cachea datos).
- **PIN de bloqueo** local opcional (pantalla Ajustes).
- **Cambiar contraseña** desde la app (pantalla Ajustes).
- Reporte imprimible con **encabezado de marca** y colores en el PDF.
- **Resumen diario por WhatsApp** vía CallMeBot + Cron de Vercel (9:00 p.m.) — *ver abajo*.

---

## ⏳ Pendiente

### Resumen diario por WhatsApp — código listo, falta activar
Todo el código está hecho (`/api/resumen-diario`, `vercel.json` con el cron, botón de
prueba en Ajustes). **Falta** la apikey de CallMeBot, que ahora mismo **está lleno**
("This Bot is full"). Para activarlo cuando reabra:
1. Enviar `I allow callmebot to send me messages` al **+34 644 51 95 23**.
2. Guardar en Vercel las variables `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY`, `CRON_SECRET`.
3. Probar con el botón "Enviar prueba ahora" en Ajustes.

**Alternativa lista para implementar si CallMeBot no reabre:** enviar el resumen por
**Telegram** (bot gratis con @BotFather, sin límites). Solo habría que cambiar el "sender"
en `/api/resumen-diario`.

### Decidido NO implementar (por ahora)
- **Estado "En revisión"** (un tercer estado además de pendiente/reflejada). El usuario
  pidió no implementarlo: agrega complejidad en dashboard/metas/reportes y aporta poco.

### Ideas sugeridas, sin empezar
- **Respaldo automático programado**: requiere un servicio de correo gratis (ej. Resend)
  para enviarse solo; hoy el respaldo es manual (botón en Reportes).
- **Biometría (huella)** para desbloquear: hoy hay PIN; la huella requiere WebAuthn.
- **Reporte PDF con logo propio** si más adelante hay un archivo de logo.
- **Enviar resumen/recordatorios a clientes** (no solo a un número): necesitaría la API
  oficial de WhatsApp (Meta) o el bot propio del usuario siempre encendido.

---

## 🔐 Notas importantes
- **No cambies `ENCRYPTION_KEY`** una vez que hay datos cifrados: dejarían de poder leerse.
- El `.env` local apunta a la base de **producción** (Neon); cuidado al hacer pruebas.
- Las claves reales viven en `.env` (local, ignorado por git) y en las variables de
  entorno de Vercel.
