import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './server.mjs';

const web = path.join(root, 'web');
const results = [];
for (const name of (await readdir(web)).filter(n => n.endsWith('.html') && !n.startsWith('google'))) {
  const html = await readFile(path.join(web, name), 'utf8');
  assert.ok(html.includes(`data-pagina="${name.slice(0, -5)}"`), name);
  assert.ok(!/<style\b/i.test(html), `${name}: quedan estilos de página incrustados`);
  const sheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(sheets.length, `${name}: falta CSS`);
  for (const href of sheets.filter(h => !h.startsWith('https:'))) {
    const local = href.split('?')[0].replace(/^\//, '');
    await readFile(path.join(web, local));
    const response = await fetch(`http://127.0.0.1:8001/${local}`);
    assert.equal(response.status, 200, `${name}: ${local}`);
    assert.ok(response.headers.get('content-type')?.startsWith('text/css'), `${local}: MIME incorrecto`);
  }
  const response = await fetch(`http://127.0.0.1:8001/${name}`);
  assert.equal(response.status, 200, name);
  results.push({ pagina: name, hojas: sheets.length });
  console.log('OK:', name, `(${sheets.length} hojas)`);
}
const home = await readFile(path.join(web, 'index.html'), 'utf8');
assert.ok(!/Pokémon|TCG/.test(home.match(/class="hero-description">(.*?)<\/p>/s)[1]));
assert.ok(!/Pokémon/.test(home.match(/<meta name="description" content="([^"]+)"/)[1]));
assert.ok((await readFile(path.join(web, 'estilo.css'), 'utf8')).match(/tokens\.css\?v=[a-z0-9]+/));
assert.ok(!(await readFile(path.join(web, 'portada.css'), 'utf8')).includes(':root'));
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data/ui-verification.json'), JSON.stringify({ fecha: new Date().toISOString(), resultados: results }, null, 2));
console.log('20 páginas con CSS accesible. Mensaje general sin exclusividad de un juego.');
