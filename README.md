# 💳 Mis Transferencias · Full Party

App web segura para registrar y controlar transferencias. Reemplaza la versión
anterior de un solo archivo HTML.

🌐 **En vivo:** https://fullpartyregistropagos.vercel.app

## ✨ Qué incluye

**Seguridad**
- 🔐 **Login** con contraseña (hasheada con bcrypt) y rate-limit anti-fuerza-bruta.
- 🛡️ **Datos sensibles cifrados** (números de cuenta, tarjetas, CLABE) con AES-256-GCM.
  En la base de datos se ven ilegibles; solo se guardan los últimos 4 dígitos en claro.
- 👁️ **Enmascarado**: en pantalla solo ves `•••• •••• •••• 1234`, con botón "Mostrar".
- 🔢 **PIN de bloqueo** opcional en el dispositivo (candado local, además de la sesión).
- 🫆 **Desbloqueo con huella / rostro** (biometría del dispositivo, opcional).
- 🔑 **Cambiar contraseña** desde la app (pantalla Ajustes).
- 🗑️ **Papelera de reciclaje**: lo que borras se puede restaurar o eliminar definitivo.
- 📝 **Auditoría**: registra creaciones, ediciones, borrados y accesos.

**Clientes**
- 👥 Clientes con sus cuentas/tarjetas guardadas y seguras.
- 🔎 Buscador de clientes y alta plegable (no se confunde buscar con agregar).
- 🧠 **Autodetección** del tipo de número al teclear: CLABE (18), tarjeta (15–16), cuenta.
- 💬 **WhatsApp del cliente**: botón que abre el chat con los datos de la cuenta escritos.
- 📋 **Copiar** los datos de una cuenta al portapapeles.
- 🎯 **Metas** de transferencia por cliente, con barra de avance.
- 🔀 **Ver movimientos**: abre las transferencias filtradas de ese cliente.

**Transferencias**
- 💸 Registro, filtros, estados (pendiente/reflejada), edición y borrado.
- 🔎 **Buscar** por referencia, cliente **o monto**.
- ✔️ **Marcar reflejada de un toque** (en la lista y en el Inicio).
- 📄 **Duplicar** una transferencia para registrar otra parecida rápido.
- ⚠️ **Aviso de posible duplicado** al registrar (mismo cliente, monto y día).
- ⏱️ **Aviso de pendientes atrasadas** (3+ días sin reflejarse).
- 🧾 **Comprobante en imagen** para el cliente: genera un recibo bonito y lo
  compartes por WhatsApp o lo descargas.
- 📷 **Comprobante por foto** (cámara directa) con **lectura automática (OCR)** de
  monto, referencia y banco. Se comprime y se guarda en WebP.

**Inicio y reportes**
- 🏠 Dashboard con totales por moneda, gráfica por mes (con montos), **por banco**
  y **por cliente**, y últimas transferencias.
- 📊 Reportes: filtros, resumen en vivo, exportar a Excel/CSV, respaldo JSON,
  reporte imprimible/PDF agrupado por cliente con subtotales.
- 🔒 **Respaldo cifrado con contraseña** + página para **descifrarlo**.
- 📧 **Respaldo automático por correo** cada semana (gratis vía Resend).

**App**
- 📱 **Instalable** en el celular (PWA): ícono en pantalla de inicio y pantalla completa.
- 🌙 **Modo oscuro** y diseño optimizado para móvil.
- 📲 **Resúmenes por WhatsApp** (gratis vía CallMeBot): diario a las 7:00 p.m. y
  semanal los domingos; del mes y "solo atrasadas" a un toque desde Ajustes.

## 🧰 Tecnología

Next.js 16 · React 19 · Prisma 6 · PostgreSQL (Neon) · Tailwind 4 · jose · bcrypt ·
Tesseract.js (OCR) · SWR. Desplegada en Vercel (redespliega solo con cada push a `main`).

## 💻 Correr en local

```bash
npm install
# 1) pon tu DATABASE_URL de Neon en .env (ver .env.example)
npx prisma db push      # crea las tablas
npx prisma db seed      # crea el usuario admin (ADMIN_EMAIL / ADMIN_PASSWORD en .env)
npm run dev             # http://localhost:3000
```

## 🚀 Subir a internet

Sigue la guía paso a paso en **[DESPLIEGUE.md](./DESPLIEGUE.md)** (Neon + GitHub + Vercel, gratis).

## 🔑 Variables de entorno

Ver `.env.example`. Las 3 críticas:
- `DATABASE_URL` — conexión a Postgres (Neon).
- `ENCRYPTION_KEY` — 32 bytes base64. **No la pierdas ni la cambies con datos guardados.**
- `SESSION_SECRET` — firma las sesiones.

Opcionales:
- `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` — resúmenes por WhatsApp a tu número.
- `CRON_SECRET` — protege el envío automático (el Cron de Vercel lo manda como Bearer).
- `RESEND_API_KEY`, `BACKUP_EMAIL` — respaldo automático por correo (Resend).

## 📜 Historial y pendientes

Ver **[CAMBIOS.md](./CAMBIOS.md)** para el detalle de lo implementado y lo que falta.
