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
- **Resumen diario por WhatsApp** vía CallMeBot + Cron de Vercel.

### Lote del 2026-06-08
- **Reporte imprimible a todo el ancho** de la hoja (márgenes mínimos) y vista
  tipo documento; filas alternadas.
- **Resumen por WhatsApp activado** y movido a las **7:00 p.m.**; además **semanal**
  (domingos) automático, y **del mes** / **solo atrasadas** a un toque en Ajustes.
- **Papelera de reciclaje**: borrar (transferencias y clientes) manda a la papelera;
  se puede restaurar, eliminar definitivo o vaciar. Todas las vistas la ignoran.
- **Buscar transferencias por monto** (además de referencia/cliente).
- **Aviso de posible duplicado** al registrar (mismo cliente, monto y día), con
  opción de continuar.
- **Comprobante en imagen** por transferencia: genera un recibo (canvas) para
  compartir por WhatsApp o descargar.
- **Más gráficas** en el Inicio: por **cliente** (MXN) y **montos por mes**.
- **Desbloqueo con huella / rostro** (WebAuthn local) además del PIN.
- **Respaldo cifrado con contraseña** (se cifra en el navegador) + página
  **/descifrar** para recuperarlo.
- **Respaldo automático por correo** (Resend), enganchado al cron semanal, con
  botón de prueba en Ajustes.

---

## ⏳ Pendiente

### Decidido NO implementar (por ahora)
- **Estado "En revisión"** (un tercer estado además de pendiente/reflejada). El usuario
  pidió no implementarlo: agrega complejidad en dashboard/metas/reportes y aporta poco.

### Por activar (código listo, falta configurar claves)
- **Respaldo automático por correo (Resend)**: ya está hecho y enganchado al cron
  semanal. Falta crear cuenta en resend.com y guardar `RESEND_API_KEY` y
  `BACKUP_EMAIL` en Vercel. Mientras tanto, el respaldo manual (JSON y cifrado)
  funciona desde Reportes.
- **Resumen mensual / solo-atrasadas automáticos**: el plan gratis de Vercel
  permite 2 crons (ya usados por el diario y el semanal). Por ahora se envían a
  mano desde Ajustes; con plan Pro se podrían automatizar.

### Ideas sugeridas, sin empezar
- **Reporte PDF con logo propio** si más adelante hay un archivo de logo.
- **Enviar resumen/recordatorios a clientes** (mensajería directa, no solo el
  comprobante en imagen): necesitaría la API oficial de WhatsApp (Meta) o un bot
  propio siempre encendido.

---

## 🔐 Notas importantes
- **No cambies `ENCRYPTION_KEY`** una vez que hay datos cifrados: dejarían de poder leerse.
- El `.env` local apunta a la base de **producción** (Neon); cuidado al hacer pruebas.
- Las claves reales viven en `.env` (local, ignorado por git) y en las variables de
  entorno de Vercel.
