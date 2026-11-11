// Lancé automatiquement par Wrangler juste avant chaque mise en ligne (voir « build » dans
// wrangler.jsonc) : écrit la date du jour (heure de Paris) dans js/core/build-info.js,
// affichée en pied de page, et dans les <lastmod> de sitemap.xml.
// Ne tourne pas en local (python -m http.server) : build-info.js y garde sa valeur vide.
import { readFileSync, writeFileSync } from 'node:fs';

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date()); // AAAA-MM-JJ

writeFileSync(new URL('../js/core/build-info.js', import.meta.url),
    `// Écrit automatiquement à la mise en ligne par scripts/stamp-date.mjs\nexport const SITE_UPDATED = '${today}';\n`);

const sitemapUrl = new URL('../sitemap.xml', import.meta.url);
const sitemap = readFileSync(sitemapUrl, 'utf8');
writeFileSync(sitemapUrl, sitemap.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));

console.log(`Date de mise à jour du site : ${today}`);
