# Press Kit Digital

**An electronic press kit for music artists, with a self-service admin panel and no database.** Bio, rider, tour dates, SoundCloud sets, YouTube videos and press photos — all editable by the artist from the browser, published straight to production.

🔗 **[presskit-digital.vercel.app](https://presskit-digital.vercel.app)** — reference deployment
🔗 **[ctrlz-presskit.vercel.app](https://ctrlz-presskit.vercel.app)** — same codebase, second artist

---

## v2 front-end: "Ritual de cromo"

KEXXY's own kit now runs a custom front-end built on the same content model and admin panel:

- **Liquid-chrome sigil in real time** (Three.js, extruded from the vectorised sigil). It loads after first paint; a static render shows until it is ready, and it stops rendering when the hero is off screen.
- **Intro, first visit per session only:** the red logo animation morphs, the kick flashes it into chrome and it flies into the hero. Skippable, and never shown with reduced motion.
- **Everything pulses at 150 BPM** with CSS animations on the compositor; the WebGL clock is synced to them.
- **Sets as CDJ decks:** each SoundCloud set is paired with the YouTube video in the same position in the panel. The SoundCloud player only loads when someone presses play, and two decks never play at once.
- **Rider → PDF:** "Technical rider" prints only the rider section, so a promoter can save it as a PDF.
- Text still comes from `content.json` (ES/EN/PT) and dates from `dates.json`; the panel edits both exactly as before.

| Path | What |
|---|---|
| `index.html` | Markup with the Spanish copy as the no-JS fallback |
| `assets/css/ritual.css` | All styles |
| `assets/js/ritual.js` | Content, i18n, decks, dates, intro, form, cues |
| `assets/js/sigil-gl.js` | WebGL sigil bundle (built from `tools/gl/`) |
| `assets/brand/`, `assets/img/`, `assets/video/`, `assets/gl/` | Logo renders, photos, logo animations, sigil normal map |

Rebuilding the WebGL bundle: `cd tools/gl && npm install && npm run build`. CSS/JS and the bundle are referenced with `?v=`; bump it (and `CACHE_NAME` in `sw.js`) when they change.

> The cloning flow below (`docs/CLONAR-ARTISTA.md`, `scripts/setup-artist.js`) was written for the v1 front-end, which stays in the git history. The v2 front-end is specific to KEXXY's identity.

## Why it exists

A press kit is what an artist sends to a promoter at 2am from their phone. It has to load instantly on bad signal, look serious, and stay current — and the artist has to be able to update it themselves, because a booking confirmed on Tuesday is useless on a site updated next month.

So: no framework on the front, and a panel the artist actually uses.

## The interesting part: the repository *is* the database

There's no database and no CMS. The admin panel writes `content.json` and `dates.json` **back into this repository through the GitHub API**. The site reads them back live through `/api/public` (server-side token, cached 60 s at the edge), so a change shows up in about a minute without waiting for a redeploy; the copies inside the deployment are the fallback. Images uploaded from the panel are served the same way until a deployment includes them.

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

## Front v2: "Ritual de cromo"

El kit de KEXXY ahora usa un front propio, con el mismo modelo de contenido y el mismo panel:

- **Sigilo de cromo líquido en tiempo real** (Three.js, extruido del sigilo vectorizado). Carga después del primer render; mientras tanto se ve un render estático, y deja de dibujar cuando el hero sale de pantalla.
- **Intro, solo la primera visita de cada sesión:** el logo rojo animado se deforma, el bombo lo vuelve cromo y vuela al hero. Se puede saltar y nunca aparece con movimiento reducido.
- **Todo late a 150 BPM** con animaciones CSS en el compositor; el reloj del WebGL va sincronizado.
- **Sets como decks de CDJ:** cada set de SoundCloud va con el video de YouTube que está en la misma posición en el panel. El reproductor de SoundCloud carga recién cuando alguien aprieta play, y nunca suenan dos decks a la vez.
- **Rider → PDF:** "Rider técnico" imprime solo la sección del rider, para guardarla como PDF.
- Los textos siguen en `content.json` (ES/EN/PT) y las fechas en `dates.json`; el panel los edita igual que antes.

Para reconstruir el bundle del WebGL: `cd tools/gl && npm install && npm run build`. CSS/JS y el bundle van con `?v=`; subilo (y `CACHE_NAME` en `sw.js`) cuando cambien.

> El flujo de clonado (`docs/CLONAR-ARTISTA.md`, `scripts/setup-artist.js`) se escribió para el front v1, que queda en el historial de git. El front v2 es propio de la identidad de KEXXY.

**Press kit electrónico para artistas musicales, con panel de administración autogestionado y sin base de datos.** Bio, rider, fechas, sets de SoundCloud, videos de YouTube y fotos de prensa — todo editable por el artista desde el navegador y publicado directo a producción.

## Por qué existe

Un press kit es lo que un artista le manda a un promotor a las 2am desde el celular. Tiene que cargar instantáneo con mala señal, verse serio y estar actualizado — y el artista tiene que poder actualizarlo solo, porque una fecha confirmada el martes no sirve en un sitio que se actualiza el mes que viene.

Entonces: sin framework en el front, y un panel que el artista realmente usa.

## Lo interesante: el repositorio **es** la base de datos

No hay base de datos ni CMS. El panel escribe `content.json` y `dates.json` **de vuelta en este repositorio a través de la API de GitHub**. El sitio los vuelve a leer en vivo por `/api/public` (token del lado del servidor, cache de 60 s en el CDN), así un cambio se ve en aproximadamente un minuto sin esperar un redeploy; las copias del deploy quedan como respaldo. Las imágenes que se suben desde el panel se sirven igual hasta que un deploy las incluye.

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
