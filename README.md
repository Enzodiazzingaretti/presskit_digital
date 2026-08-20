# Press Kit Digital

**An electronic press kit for music artists, with a self-service admin panel and no database.** Bio, rider, tour dates, SoundCloud sets, YouTube videos and press photos — all editable by the artist from the browser, published straight to production.

🔗 **[presskit-digital.vercel.app](https://presskit-digital.vercel.app)** — reference deployment
🔗 **[ctrlz-presskit.vercel.app](https://ctrlz-presskit.vercel.app)** — same codebase, second artist

---

## Why it exists

A press kit is what an artist sends to a promoter at 2am from their phone. It has to load instantly on bad signal, look serious, and stay current — and the artist has to be able to update it themselves, because a booking confirmed on Tuesday is useless on a site updated next month.

So: no framework on the front, and a panel the artist actually uses.

## The interesting part: the repository *is* the database

There's no database and no CMS. The admin panel writes `content.json` and `dates.json` **back into this repository through the GitHub API**, which triggers a Vercel redeploy. The site updates in about a minute.

What that buys:

- **Every content change is a commit.** Full history, diffable, revertible with `git revert`.
- **Zero infrastructure cost or maintenance.** No database to back up, migrate or pay for.
- **The content is portable.** It's a JSON file in a repo, not rows in someone's SaaS.

The trade-off, stated plainly: writes are slow (a commit plus a deploy) and it would fall apart with concurrent editors or high-frequency updates. For one artist editing their own kit a few times a month, it's the right shape.

## Security

Because the panel holds a token that can write to a repository, this got real attention:

- **Passwords hashed with `scrypt`**, stored as `scrypt$<salt>$<key>` — never in plaintext, never reversible
- **Signed session cookie**, 12-hour expiry
- **Write allowlist**: the API refuses to touch anything outside `content.json`, `dates.json` and `img/`. A path traversal attempt gets nowhere.
- **The target repo is never hardcoded** — it defaults to `VERCEL_GIT_REPO_*`, so a clone that forgets to set `GITHUB_REPO` writes into *itself* rather than into the original artist's site. This was a real bug, and fixing it is what made the template safe to clone.
- **Full CSP** plus `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy`, set in `vercel.json`

## Built to be cloned

`docs/CLONAR-ARTISTA.md` is a six-step guide that takes the template to a new artist's live press kit without reading any code, and `scripts/setup-artist.js` automates the rebranding. That's how it went from one artist's site to a template running two.

---

## Stack

| | |
|---|---|
| **Frontend** | Vanilla JS, CSS — no framework, no build step |
| **Backend** | Vercel serverless functions (Node) |
| **Storage** | GitHub repository via the GitHub API |
| **Auth** | `scrypt` + signed session cookie |
| **Offline** | Service worker |
| **Embeds** | SoundCloud, YouTube |

## Setup

```bash
node scripts/hash-password.js     # generates ADMIN_PASSWORD_HASH
```

Then set these environment variables in Vercel:

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD_HASH` | Output of the script above |
| `SESSION_SECRET` | Secret for signing the session cookie |
| `GITHUB_TOKEN` | Token with write access to this repo |

`GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` are optional — they default to the repository the deployment was built from.

Without these, `/admin.html` shows the login screen but reports itself as unconfigured.

To clone this for another artist, follow **[`docs/CLONAR-ARTISTA.md`](docs/CLONAR-ARTISTA.md)**.

---

<details>
<summary><b>🇦🇷 Español</b></summary>

<br>

**Press kit electrónico para artistas musicales, con panel de administración autogestionado y sin base de datos.** Bio, rider, fechas, sets de SoundCloud, videos de YouTube y fotos de prensa — todo editable por el artista desde el navegador y publicado directo a producción.

## Por qué existe

Un press kit es lo que un artista le manda a un promotor a las 2am desde el celular. Tiene que cargar instantáneo con mala señal, verse serio y estar actualizado — y el artista tiene que poder actualizarlo solo, porque una fecha confirmada el martes no sirve en un sitio que se actualiza el mes que viene.

Entonces: sin framework en el front, y un panel que el artista realmente usa.

## Lo interesante: el repositorio **es** la base de datos

No hay base de datos ni CMS. El panel escribe `content.json` y `dates.json` **de vuelta en este repositorio a través de la API de GitHub**, lo que dispara un redeploy de Vercel. El sitio se actualiza en aproximadamente un minuto.

Lo que eso te da:

- **Cada cambio de contenido es un commit.** Historial completo, con diff, reversible con `git revert`.
- **Costo y mantenimiento de infraestructura cero.** No hay base que respaldar, migrar ni pagar.
- **El contenido es portable.** Es un JSON en un repo, no filas en el SaaS de otro.

El trade-off, dicho de frente: las escrituras son lentas (un commit más un deploy) y se rompería con editores concurrentes o actualizaciones de alta frecuencia. Para un artista editando su propio kit unas veces por mes, es la forma correcta.

## Seguridad

Como el panel tiene un token con permiso de escritura sobre un repositorio, esto recibió atención real:

- **Contraseñas hasheadas con `scrypt`**, guardadas como `scrypt$<salt>$<key>` — nunca en texto plano, nunca reversibles
- **Cookie de sesión firmada**, vence a las 12 horas
- **Allowlist de escritura**: la API se niega a tocar cualquier cosa fuera de `content.json`, `dates.json` e `img/`. Un intento de path traversal no llega a ningún lado.
- **El repo destino nunca está hardcodeado** — toma por defecto `VERCEL_GIT_REPO_*`, así un clon que se olvide de setear `GITHUB_REPO` escribe sobre *sí mismo* y no sobre el sitio del artista original. Esto fue un bug real, y arreglarlo es lo que hizo que la plantilla fuera segura de clonar.
- **CSP completo** más `X-Frame-Options: DENY`, `nosniff` y `Referrer-Policy`, definidos en `vercel.json`

## Hecho para clonarse

`docs/CLONAR-ARTISTA.md` es una guía de seis pasos que lleva la plantilla al press kit en vivo de un artista nuevo sin leer una línea de código, y `scripts/setup-artist.js` automatiza el rebranding. Así pasó de ser el sitio de un artista a una plantilla que corre para dos.

## Configuración

```bash
node scripts/hash-password.js     # genera el ADMIN_PASSWORD_HASH
```

Después, cargar estas variables de entorno en Vercel:

| Variable | Para qué |
|---|---|
| `ADMIN_PASSWORD_HASH` | Salida del script de arriba |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión |
| `GITHUB_TOKEN` | Token con permiso de escritura sobre este repo |

`GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` son opcionales — por defecto usan el repositorio desde el que se construyó el deploy.

Sin estas variables, `/admin.html` muestra el login pero se reporta como no configurado.

Para clonarlo para otro artista, seguir **[`docs/CLONAR-ARTISTA.md`](docs/CLONAR-ARTISTA.md)**.

</details>
