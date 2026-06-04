# 💳 Mis Transferencias · Full Party

App web segura para registrar y controlar transferencias. Reemplaza la versión
anterior de un solo archivo HTML.

## ✨ Qué incluye

- 🔐 **Login** con contraseña (hasheada con bcrypt). Nadie ve los datos sin entrar.
- 🛡️ **Datos sensibles cifrados** (números de cuenta, tarjetas, CLABE) con AES-256-GCM.
  En la base de datos se ven ilegibles; solo se guardan los últimos 4 dígitos en claro.
- 👁️ **Enmascarado**: en pantalla solo ves `•••• •••• •••• 1234`, con botón "Mostrar".
- 👥 **Clientes** con sus cuentas/tarjetas guardadas y seguras.
- 💸 **Transferencias**: registro, filtros, estados (pendiente/reflejada), edición.
- 🏠 **Dashboard** con totales por moneda y últimas transferencias.
- 📊 **Reportes**: exportar a Excel/CSV, respaldo JSON, imprimir/PDF.
- 📱 **Instalable** en el celular (PWA).
- 📝 **Auditoría**: registra creaciones, ediciones, borrados y accesos.

## 🧰 Tecnología

Next.js 16 · React 19 · Prisma 6 · PostgreSQL (Neon) · Tailwind 4 · jose · bcrypt.

## 💻 Correr en local

```bash
npm install
# 1) pon tu DATABASE_URL de Neon en .env
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
