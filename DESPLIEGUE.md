# 🚀 Cómo subir la app a internet (gratis)

Guía paso a paso. No necesitas saber programar. Todo es gratis y sin tarjeta.

Vas a usar 3 servicios:
1. **Neon** → la base de datos (donde se guardan tus datos, cifrados).
2. **GitHub** → guarda el código de la app.
3. **Vercel** → publica la app en internet.

---

## 🔑 Paso 0 — Genera tus claves secretas

Estas claves protegen tus datos. Ya hay unas en el archivo `.env`, pero para
producción conviene generar unas nuevas. Abre una terminal en la carpeta
`transferencias-web` y ejecuta:

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
```

Copia los dos resultados a un lugar seguro. Los usarás en el Paso 3.

> ⚠️ **MUY IMPORTANTE:** Guarda bien la `ENCRYPTION_KEY`. Si la pierdes o la
> cambias después de tener datos, **no podrás descifrar** los números de cuenta.

---

## 🗄️ Paso 1 — Crear la base de datos en Neon

1. Entra a **https://neon.tech** y regístrate (puedes usar tu cuenta de Google).
2. Crea un proyecto nuevo (cualquier nombre, ej. "transferencias").
3. En el panel verás **"Connection string"**. Cópiala. Se ve así:
   ```
   postgresql://usuario:clave@ep-xxxx.neon.tech/neondb?sslmode=require
   ```
4. Pega esa cadena en el archivo `.env`, en la línea `DATABASE_URL="..."`.

Ahora crea las tablas y tu usuario. En la terminal:

```bash
npx prisma db push      # crea las tablas en Neon
npx prisma db seed      # crea tu usuario para iniciar sesión
```

> El usuario y contraseña salen de `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`.
> **Cambia `ADMIN_PASSWORD`** por una contraseña fuerte antes de correr el seed.

✅ Prueba local: corre `npm run dev` y abre http://localhost:3000 — deberías
poder iniciar sesión.

---

## 📦 Paso 2 — Subir el código a GitHub

1. Crea una cuenta en **https://github.com** si no tienes.
2. Crea un repositorio nuevo (privado), por ejemplo `transferencias-web`.
3. En la terminal, dentro de la carpeta `transferencias-web`:

```bash
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/transferencias-web.git
git push -u origin main
```

> El archivo `.env` NO se sube (está protegido). Tus claves quedan seguras.

---

## 🌐 Paso 3 — Publicar en Vercel

1. Entra a **https://vercel.com** y regístrate con tu cuenta de GitHub.
2. Clic en **"Add New… → Project"** y elige tu repositorio `transferencias-web`.
3. Antes de hacer deploy, abre **"Environment Variables"** y agrega estas 6:

   | Nombre | Valor |
   |--------|-------|
   | `DATABASE_URL` | la cadena de conexión de Neon (Paso 1) |
   | `ENCRYPTION_KEY` | la clave que generaste en el Paso 0 |
   | `SESSION_SECRET` | la otra clave del Paso 0 |
   | `ADMIN_EMAIL` | tu correo para iniciar sesión |
   | `ADMIN_PASSWORD` | tu contraseña fuerte |
   | `ADMIN_NAME` | tu nombre |

4. Clic en **"Deploy"**. En 1-2 minutos tendrás una URL tipo
   `https://transferencias-web.vercel.app`.

✅ Abre esa URL, inicia sesión y ¡listo! Ya está en internet.

> 📱 **Instalar en el celular:** abre la URL en Chrome → menú (⋮) →
> "Agregar a pantalla de inicio". Se verá como una app normal.

---

## 🔄 Actualizar la app más adelante

Cada vez que cambies algo:

```bash
git add .
git commit -m "describe el cambio"
git push
```

Vercel publica los cambios automáticamente en segundos.

---

## 🆘 Problemas comunes

- **No puedo iniciar sesión en producción:** revisa que `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  en Vercel sean los mismos con los que corriste `npx prisma db seed`. Si los
  cambiaste, vuelve a correr el seed apuntando a Neon.
- **Error de base de datos:** confirma que `DATABASE_URL` en Vercel sea exactamente
  la de Neon, con `?sslmode=require` al final.
- **Olvidé mi contraseña:** cambia `ADMIN_PASSWORD` en `.env` y vuelve a correr
  `npx prisma db seed` (actualiza la contraseña de tu usuario).
```
