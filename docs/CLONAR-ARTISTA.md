# Clonar el press kit para un artista nuevo

Guía paso a paso para tomar esta plantilla y dejar un press kit propio, con panel
de administración, para otro artista. Pensada para hacerse de principio a fin sin
tener que leer el código.

Al terminar, el artista tiene:

- un sitio público (`index.html`) con su nombre, bio, rider, fechas, sets y videos;
- un panel privado en `/admin.html` para editar **todo** sin tocar código;
- deploy automático en Vercel (cada cambio publicado se redeploya solo).

> **La firma del footer no se toca.** Enlaza a `https://portfolio-kexxy.vercel.app`
> y se mantiene para cualquier artista: es el crédito de autoría de la plantilla,
> no es contenido configurable.

---

## Requisitos previos

- **Node.js** instalado (para correr los scripts).
- Cuenta de **GitHub** (el repo hace de base de datos del panel).
- Cuenta de **Vercel** conectada a esa cuenta de GitHub.
- Dos logos del artista en PNG con fondo transparente: uno **negro** y uno **blanco**
  (opcionales, se pueden cargar después).

---

## Resumen (los 6 pasos)

1. Duplicar el repositorio para el artista nuevo.
2. `node scripts/setup-artist.js` — personaliza nombre, URL y metadatos.
3. Subir los cambios a GitHub.
4. Importar el repo en Vercel y hacer el primer deploy.
5. `node scripts/hash-password.js` — generar y cargar las 3 variables de entorno.
6. Entrar a `/admin.html` y cargar textos, fechas e imágenes.

---

## Paso 1 — Duplicar el repositorio

Creá un repo nuevo en la cuenta de GitHub del artista (por ejemplo
`presskit-nova`) a partir de esta plantilla. Podés usar “Use this template” en
GitHub, o clonar y volver a apuntar el remoto:

```bash
git clone https://github.com/enzodiazzingaretti27-design/presskit_digital.git presskit-nova
cd presskit-nova
git remote set-url origin https://github.com/<cuenta>/presskit-nova.git
```

> El panel escribe sobre el **mismo repo** desde el que se deployó. Cada artista
> necesita su propio repositorio; no compartas uno entre varios.

## Paso 2 — Personalizar con `setup-artist.js`

```bash
node scripts/setup-artist.js
```

Te va a preguntar, en orden:

| Pregunta | Ejemplo | Qué hace |
|----------|---------|----------|
| Nombre artístico | `NOVA` | Reemplaza el nombre en todo el markup |
| URL del sitio | `https://presskit-nova.vercel.app` | Fija la URL canónica y las de compartir (og/twitter) |
| Descripción corta | `DJ y productor de techno de Córdoba` | Meta description y descripción para compartir |
| Logo negro (ruta) | `./logos/nova-black.png` | Se copia a `logo-black.png` (enter para omitir) |
| Logo blanco (ruta) | `./logos/nova-white.png` | Se copia a `logo-white.png` (enter para omitir) |

El script hace todo esto por vos:

- Reescribe `index.html`: `<title>`, description, author, keywords, y las etiquetas
  `og:`/`twitter:` — necesarias porque los robots de WhatsApp, Telegram y Google
  **no ejecutan JavaScript**, así que ese texto tiene que estar en el HTML.
- Regenera `sitemap.xml` con la URL nueva y la fecha de hoy.
- Limpia `content.json`: pone el nombre nuevo, **vacía** sets y videos y **borra**
  las credenciales (EmailJS, Analytics) del artista anterior.
- Renombra los logos `kexxy-logo-*.png` → `logo-black.png` / `logo-white.png` y
  actualiza todas las referencias en `index.html`, `admin.html`, `style.css` y `sw.js`.

> Si omitís los logos, quedan los archivos con el nombre genérico y podés
> reemplazar `logo-black.png` / `logo-white.png` a mano cuando los tengas.

## Paso 3 — Subir a GitHub

```bash
git add -A
git commit -m "Setup para NOVA"
git push
```

## Paso 4 — Importar en Vercel y primer deploy

1. En Vercel: **Add New… → Project → Import** el repo del artista.
2. Vercel detecta un sitio estático + funciones serverless en `api/`. No hace falta
   configurar build: dejá los valores por defecto.
3. **Deploy.** El sitio público ya queda online; el panel todavía no funciona hasta
   cargar las variables de entorno (Paso 5).

> El `OWNER`/`REPO` del panel se autocompletan desde la integración de Git de Vercel
> (`VERCEL_GIT_REPO_OWNER` / `VERCEL_GIT_REPO_SLUG`), así que **no** hace falta setear
> `GITHUB_OWNER`/`GITHUB_REPO` a mano. Ver `api/_lib.js`.

## Paso 5 — Variables de entorno del panel

Generá las credenciales:

```bash
node scripts/hash-password.js
```

Te pide una contraseña (mínimo **10 caracteres**; no se guarda en ningún archivo ni
sale de tu máquina) y te imprime dos de las tres variables. Cargá las **tres** en
**Vercel → Settings → Environment Variables**:

| Variable | De dónde sale |
|----------|---------------|
| `ADMIN_PASSWORD_HASH` | La imprime `hash-password.js` (empieza con `scrypt$…`) |
| `SESSION_SECRET` | La imprime `hash-password.js` (aleatoria) |
| `GITHUB_TOKEN` | Fine-grained token de GitHub — ver abajo |

**El `GITHUB_TOKEN`** es un *fine-grained personal access token*
(GitHub → Settings → Developer settings → Fine-grained tokens):

- Alcance: **solo el repositorio de este artista**.
- Permiso: **Contents → Read and write** (con eso el panel puede guardar
  `content.json`, `dates.json` e imágenes vía la API de GitHub).

Después de cargar las tres variables, **redeployá** el proyecto en Vercel para que
tomen efecto (Deployments → ⋯ → Redeploy).

> Opcionales: si el repo usara una rama distinta de `main`, seteá `GITHUB_BRANCH`.
> Por defecto toma la rama del deploy (`VERCEL_GIT_COMMIT_REF`).

## Paso 6 — Cargar el contenido desde el panel

1. Entrá a `https://<sitio>/admin.html`.
2. Ingresá con la contraseña del Paso 5 (la sesión dura 12 horas en ese navegador).
3. Completá: **Fechas**, **Textos**, **Artista** (bio), **Media** (sets de SoundCloud
   y videos de YouTube), **Imágenes**. En **Avanzado → Integraciones** poné las
   credenciales de **EmailJS** del artista y, si querés, Google Analytics.
4. **Publicar cambios.** Cada publicación hace un commit vía la API de GitHub y
   dispara un redeploy automático en Vercel (~30–60 s hasta verse online).

---

## Cómo funciona (contexto rápido)

- **Sin framework.** HTML + CSS + JS vanilla. El contenido vive en `content.json`
  (y las fechas en `dates.json`); el sitio los *fetchea* al cargar.
- **GitHub como backend.** El panel no tiene base de datos: guarda escribiendo esos
  JSON en el propio repo con el `GITHUB_TOKEN`. El repo *es* la base de datos.
- **Publicación diferida.** Los cambios no son instantáneos: se ven después del
  redeploy de Vercel. Es esperado.
- **Dos modos de login del panel:**
  - *Contraseña* (producción, con las env vars cargadas) → `api/login.js`.
  - *Token* (entornos sin API, ej. preview local) → pegás un fine-grained token a mano.

## Problemas comunes

| Síntoma | Causa probable |
|---------|----------------|
| El panel dice “no configurado” (501) | Falta alguna env var, o no se redeployó tras cargarlas |
| Login rechazado | `ADMIN_PASSWORD_HASH` mal pegada (que sea el string completo `scrypt$…`) |
| Publica pero no aparece | Todavía no terminó el redeploy de Vercel — esperá ~1 min |
| Error al guardar imágenes | El `GITHUB_TOKEN` no tiene **Contents: Read and write** o apunta a otro repo |

## Archivos y scripts relevantes

- `scripts/setup-artist.js` — personalización inicial (Paso 2).
- `scripts/hash-password.js` — genera `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` (Paso 5).
- `api/_lib.js` — auth, sesión y helpers de la API de GitHub (define qué env vars se usan).
- `content.json` / `dates.json` — el contenido editable (los únicos archivos que el panel puede escribir).
