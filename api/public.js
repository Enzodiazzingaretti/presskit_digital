/* Lectura pública y en vivo de lo que publica el panel.

   GET /api/public?file=content.json | dates.json | img/<slot>-<n>.webp

   El panel guarda en el repo de GitHub. Esta ruta lee esos archivos directo del repo
   (con el token del lado del servidor), así los cambios se ven en el sitio en ~1 minuto
   sin depender de que Vercel vuelva a desplegar. El CDN cachea las respuestas:
   - JSON: 60 s, y sirve la copia anterior mientras revalida.
   - Imágenes: para siempre (el panel les pone un nombre nuevo en cada subida).
   Si algo falla, el front usa las copias estáticas del deploy. */
const { OWNER, REPO, BRANCH, isAllowedFile, isAllowedImagePath } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const file = String((req.query && req.query.file) || '');
  const isImage = isAllowedImagePath(file);
  if (!isImage && !isAllowedFile(file)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'bad_file' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token || !OWNER || !REPO) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(501).json({ error: 'not_configured' });
  }

  try {
    const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + file + '?ref=' + encodeURIComponent(BRANCH);
    const gh = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.raw',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kexxy-presskit-public'
      }
    });

    if (gh.status === 404) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
      return res.status(404).json({ error: 'not_found' });
    }
    if (!gh.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'github_' + gh.status });
    }

    const body = Buffer.from(await gh.arrayBuffer());

    if (isImage) {
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(body);
    }

    JSON.parse(body.toString('utf8')); // nunca servir un JSON roto: el front caería a la copia estática
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).send(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'read_failed' });
  }
};
