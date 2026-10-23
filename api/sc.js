/* Datos reales de un set de SoundCloud, para que el sitio muestre lo mismo que SoundCloud.

   GET /api/sc?url=https://api.soundcloud.com/tracks/123  (o el link público del track)

   Devuelve título, portada, género, duración, fecha, descripción, link y la forma de onda
   real (reducida a 180 barras). Lo lee de la página pública del track; si eso falla,
   usa el oEmbed oficial (título y portada). El CDN lo cachea 12 h y sirve la copia
   anterior mientras revalida, así SoundCloud casi nunca se consulta. */

const TRACK_API = /^https:\/\/api\.soundcloud\.com\/tracks\/\d+\/?$/i;
const PERMALINK = /^https:\/\/(?:www\.|m\.)?soundcloud\.com\/[a-z0-9_-]+\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)?\/?(?:\?[^\s]*)?$/i;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BARS = 180;

async function get(url, kind) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(kind + '_' + r.status);
    return kind === 'json' ? await r.json() : await r.text();
  } finally {
    clearTimeout(timer);
  }
}

// la página del widget trae el link público del track (canonical)
async function permalinkOf(url) {
  if (!TRACK_API.test(url)) return url;
  const html = await get('https://w.soundcloud.com/player/?url=' + encodeURIComponent(url), 'text');
  const m = html.match(/<link rel="canonical" href="(https:\/\/soundcloud\.com\/[^"]+)"/i);
  return m ? m[1] : null;
}

function soundFrom(html) {
  const m = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[1]);
    const s = arr.find((x) => x && x.hydratable === 'sound');
    return s && s.data ? s.data : null;
  } catch (e) {
    return null;
  }
}

function downsample(samples, height) {
  if (!Array.isArray(samples) || !samples.length) return null;
  const max = height || Math.max.apply(null, samples) || 1;
  const out = [];
  const step = samples.length / BARS;
  for (let i = 0; i < BARS; i++) {
    let peak = 0;
    for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j++) peak = Math.max(peak, samples[j] || 0);
    out.push(Math.round((peak / max) * 100) / 100);
  }
  return out;
}

const artwork = (u) => (u ? String(u).replace(/-(large|t\d+x\d+|crop|original)\.(jpg|png)$/i, '-t500x500.$2') : null);

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const url = String((req.query && req.query.url) || '').trim();
  if (!TRACK_API.test(url) && !PERMALINK.test(url)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'bad_url' });
  }

  let out = null;
  try {
    const link = await permalinkOf(url);
    const s = link ? soundFrom(await get(link, 'text')) : null;
    if (s && s.title) {
      out = {
        title: s.title,
        artwork: artwork(s.artwork_url || (s.user && s.user.avatar_url)),
        genre: s.genre || '',
        duration: s.full_duration || s.duration || 0,
        date: s.display_date || s.release_date || s.created_at || '',
        description: s.description || '',
        permalink: s.permalink_url || link,
        user: (s.user && s.user.username) || '',
        wave: null
      };
      if (s.waveform_url && /^https:\/\/wave\.sndcdn\.com\/[\w-]+\.json$/i.test(s.waveform_url)) {
        try {
          const w = await get(s.waveform_url, 'json');
          out.wave = downsample(w.samples, w.height);
        } catch (e) { /* sin onda: el front muestra el player */ }
      }
    }
  } catch (e) { /* probamos con oEmbed */ }

  if (!out) {
    try {
      const o = await get('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(url), 'json');
      const by = o.author_name ? new RegExp('\\s+by\\s+' + String(o.author_name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i') : null;
      out = {
        title: by ? String(o.title || '').replace(by, '') : String(o.title || ''),
        artwork: artwork(o.thumbnail_url),
        genre: '',
        duration: 0,
        date: '',
        description: o.description || '',
        permalink: null,
        user: o.author_name || '',
        wave: null
      };
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'soundcloud_unreachable' });
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=43200, stale-while-revalidate=604800');
  return res.status(200).json(out);
};

module.exports._test = { TRACK_API, PERMALINK, downsample, soundFrom, artwork };
