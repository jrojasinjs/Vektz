# Deploy de Vektz en Netlify

## Requisitos previos
- Cuenta de GitHub con el repo Vektz
- Navegador web

## Paso 1 — Crear cuenta en Netlify

1. Ir a [netlify.com](https://www.netlify.com)
2. Clic en **Sign up**
3. Seleccionar **Sign up with GitHub**
4. Autorizar el acceso

## Paso 2 — Crear nuevo sitio

1. En el dashboard, clic en **Add new site** > **Import an existing project**
2. Seleccionar **GitHub** como proveedor
3. Autorizar acceso a los repositorios
4. Seleccionar el repo **Vektz**

## Paso 3 — Configurar el build

Vektz es un sitio estatico puro, no necesita build step:

| Campo | Valor |
|---|---|
| Branch to deploy | `main` |
| Build command | *(vacio)* |
| Publish directory | `.` |

Clic en **Deploy site**.

## Paso 4 — Personalizar la URL

Netlify asigna un nombre aleatorio (ej: `random-name-123.netlify.app`).

Para cambiarlo:

1. Ir a **Site settings** > **Domain management**
2. Clic en **Options** > **Edit site name**
3. Escribir `vektz`
4. La URL queda como `vektz.netlify.app`

## Paso 5 — Hacer el repo privado en GitHub

Una vez confirmado que el deploy funciona:

1. En GitHub: ir a **Settings** del repo
2. Bajar a **Danger Zone**
3. Clic en **Change visibility** > **Make private**
4. Netlify sigue deployando porque ya tiene acceso autorizado

## Deploy automatico

Cada `git push` a `main` dispara un redeploy automatico en Netlify. No se requiere accion manual.

## Notas

- **Free tier**: 100 GB bandwidth/mes, 300 min build/mes (mas que suficiente)
- **Custom domain**: se puede agregar en **Domain management** (incluye HTTPS gratis)
- **Rollbacks**: Netlify guarda cada deploy, se puede revertir desde el dashboard en **Deploys**
