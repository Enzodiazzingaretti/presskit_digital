#!/usr/bin/env node
/* Prepara una copia de la plantilla para un artista nuevo.
 *
 *   node scripts/setup-artist.js
 *
 * Reescribe lo que tiene que vivir en el HTML porque los robots de
 * WhatsApp, Telegram y Google no ejecutan JavaScript: la URL del sitio,
 * el título, la descripción y las etiquetas para compartir.
 *
 * Todo lo demás (textos, fechas, redes, imágenes, EmailJS, Analytics)
 * se edita después desde el panel en /admin.html.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const rl = readline.createInterface({ input: process.stdin });

// Buffer lines instead of using rl.question: piped input arrives faster than
// the prompts are issued, and question() would drop those early lines.
const queue = [];
const waiting = [];
let closed = false;

rl.on('line', line => {
  const value = String(line).trim();
  if (waiting.length) waiting.shift()(value);
  else queue.push(value);
});
rl.on('close', () => {
  closed = true;
  while (waiting.length) waiting.shift()('');
});

function ask(q) {
  process.stdout.write(q);
  if (queue.length) { const v = queue.shift(); process.stdout.write(v + '\n'); return Promise.resolve(v); }
  if (closed) { process.stdout.write('\n'); return Promise.resolve(''); }
  return new Promise(res => waiting.push(res));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}
function write(file, text) {
  fs.writeFileSync(path.join(ROOT, file), text, 'utf8');
}
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Every absolute URL currently baked into the markup.
function currentSiteUrl(html) {
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  return m ? m[1].replace(/\/+$/, '') : null;
}

(async () => {
  console.log('\n=== Preparar press kit para un artista ===\n');

  const name = await ask('Nombre artístico (ej: NOVA): ');
  if (!name) { console.error('Hace falta un nombre.'); rl.close(); process.exit(1); }

  let url = await ask('URL del sitio (ej: https://presskit-nova.vercel.app): ');
  url = url.replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) {
    console.error('La URL tiene que empezar con https://');
    rl.close(); process.exit(1);
  }

  const tagline = await ask('Descripción corta (ej: DJ y productor de techno de Córdoba): ');
  const logoDark = await ask('Ruta a un logo NEGRO sobre transparente (enter para omitir): ');
  const logoLight = await ask('Ruta a un logo BLANCO sobre transparente (enter para omitir): ');

  rl.close();

  /* ---------- index.html ---------- */
  let html = read('index.html');
  const oldUrl = currentSiteUrl(html);
  if (!oldUrl) { console.error('No encontré la URL canónica en index.html'); process.exit(1); }

  const previous = JSON.parse(read('content.json'));
  const oldName = (previous.artist && previous.artist.name) || '';

  const before = html;
  html = html.split(oldUrl).join(url);

  // The markup still carries the previous artist's copy as a no-JS fallback.
  // Left alone it would flash on screen before content.json loads.
  if (oldName && oldName !== name) {
    html = html.split(oldName).join(name);
  }

  // Sets and videos come from content.json now, so the baked-in copies are
  // stale duplicates of someone else's media.
  html = html.replace(
    /(<div class="listen__players">)[\s\S]*?(<\/div>\s*<a href[^>]*class="listen__link")/,
    '$1\n      $2'
  );
  html = html.replace(
    /(<div class="video-showcase__grid">)[\s\S]*?(\n      <\/div>\s*<\/div>\s*<\/section>)/,
    '$1$2'
  );

  const title = name + ' — Press Kit';
  const desc = tagline || (name + ' — press kit oficial: bio, rider, fechas y booking.');

  const swap = [
    [/<title>[^<]*<\/title>/, '<title>' + escapeAttr(title) + '</title>'],
    [/(<meta name="description" content=")[^"]*(")/, '$1' + escapeAttr(desc) + '$2'],
    [/(<meta name="author" content=")[^"]*(")/, '$1' + escapeAttr(name) + '$2'],
    [/(<meta name="keywords" content=")[^"]*(")/, '$1' + escapeAttr(name + ' press kit, ' + name + ' DJ, booking') + '$2'],
    [/(<meta property="og:title" content=")[^"]*(")/, '$1' + escapeAttr(title) + '$2'],
    [/(<meta property="og:description" content=")[^"]*(")/, '$1' + escapeAttr(desc) + '$2'],
    [/(<meta property="og:site_name" content=")[^"]*(")/, '$1' + escapeAttr(name) + '$2'],
    [/(<meta property="twitter:title" content=")[^"]*(")/, '$1' + escapeAttr(title) + '$2'],
    [/(<meta property="twitter:description" content=")[^"]*(")/, '$1' + escapeAttr(desc) + '$2'],
    [/("name":\s*")[^"]*(")/, '$1' + name.replace(/"/g, '') + '$2'],
    [/("description":\s*")[^"]*(")/, '$1' + desc.replace(/"/g, '') + '$2']
  ];
  swap.forEach(([re, to]) => { html = html.replace(re, to); });

  write('index.html', html);
  console.log('\nindex.html actualizado' + (before === html ? ' (sin cambios)' : ''));

  /* ---------- sitemap.xml ---------- */
  const today = new Date().toISOString().slice(0, 10);
  write('sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url>\n' +
    '    <loc>' + url + '/</loc>\n' +
    '    <lastmod>' + today + '</lastmod>\n' +
    '    <changefreq>monthly</changefreq>\n' +
    '    <priority>1.0</priority>\n' +
    '  </url>\n' +
    '</urlset>\n');
  console.log('sitemap.xml actualizado');

  /* ---------- content.json ---------- */
  let contentText = read('content.json');
  if (oldName && oldName !== name) {
    contentText = contentText.split(oldName).join(name);
  }
  const content = JSON.parse(contentText);
  content.artist = content.artist || {};
  content.artist.name = name;
  // Credentials are per artist: never inherit the previous inbox or property.
  content.integrations = { emailjs: { publicKey: '', serviceId: '', templateId: '' }, googleAnalytics: '' };
  content.sets = [];
  content.videos = [];
  fs.writeFileSync(path.join(ROOT, 'content.json'), JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log('content.json: nombre reemplazado, media vaciada y credenciales borradas');

  /* ---------- logos ---------- */
  [[logoDark, 'kexxy-logo-black.png'], [logoLight, 'kexxy-logo-white.png']].forEach(([src, dest]) => {
    if (!src) return;
    if (!fs.existsSync(src)) { console.log('No encontré ' + src + ', salteado'); return; }
    fs.copyFileSync(src, path.join(ROOT, dest));
    console.log('logo copiado a ' + dest);
  });

  console.log('\nListo. Lo que falta:\n');
  console.log('  1. Crear el proyecto en Vercel importando este repositorio.');
  console.log('  2. node scripts/hash-password.js  → cargar las 3 variables en Vercel.');
  console.log('  3. Entrar a ' + url + '/admin.html y cargar textos, fechas e imágenes.');
  console.log('  4. En Avanzado → Integraciones, poner las credenciales de EmailJS del artista.');
  console.log('\n  La firma del footer se mantiene: es el crédito de la plantilla.\n');
})();
