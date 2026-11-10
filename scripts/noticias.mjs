/* Noticias de Pokémon TCG para la portada.
   Lee el RSS de "Front Page News" de PokéBeach, se queda con las últimas noticias y las traduce al
   español con DeepL (solo las nuevas: lo ya traducido se reutiliza). Escribe web/noticias.json, que la
   portada lee como un archivo propio del sitio (la política de contenido no deja conectarse a otros).

   Uso:  node scripts/noticias.mjs                  (lee el feed en línea)
         node scripts/noticias.mjs --archivo f.xml  (lee un RSS guardado, para pruebas)
   La clave de DeepL va en la variable DEEPL_API_KEY (en GitHub, un secreto del repo) o, en el PC, en
   data/deepl.env con la línea DEEPL_API_KEY=... (data/ no se sube). Sin clave, guarda las noticias solo en inglés. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FEED = process.env.NOTICIAS_FEED || 'https://www.pokebeach.com/forums/forums/front-page-news.18/index.rss';
const SALIDA = process.env.NOTICIAS_SALIDA || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'noticias.json');
const MAXIMO = 12;          // noticias que se guardan
const LARGO_RESUMEN = 320;  // caracteres del resumen (no se copia el artículo completo)

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', eacute: 'é', Eacute: 'É', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ' };
export const decodificar = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTIDADES[e] ?? m);

const sinCdata = s => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
const campo = (item, tag) => { const m = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')); return m ? sinCdata(m[1]) : ''; };

/* HTML del foro → texto plano, sin imágenes, scripts ni el "Click to expand..." de XenForo. PokéBeach pone el
   texto de la noticia dentro de un <blockquote>, así que ese no se quita. */
export function aTexto(html){
  return decodificar(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<div class="bbCodeBlock-expandLink[\s\S]*?<\/div>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/Click to expand\.{3}|Read more…?/gi, ' ')
    .replace(/[ \t ]+/g, ' ').replace(/ ([,.;:!?)])/g, '$1').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();
}

/* Corta en un final de oración (o de palabra) para que el resumen no quede a medias. */
export function resumir(texto, largo = LARGO_RESUMEN){
  const plano = texto.replace(/\n+/g, ' ').trim();
  if (plano.length <= largo) return plano;
  const corte = plano.slice(0, largo);
  const punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  if (punto > largo * 0.5) return corte.slice(0, punto + 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

export function leerRss(xml){
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(([item]) => {
    const url = decodificar(campo(item, 'link').trim());
    const id = (campo(item, 'guid').trim() || url.match(/\.(\d+)\/?$/)?.[1] || url);
    const fecha = new Date(campo(item, 'pubDate').trim());
    return {
      id: String(id), url,
      fecha: isNaN(fecha) ? null : fecha.toISOString(),
      autor: decodificar(campo(item, 'dc:creator').trim()),
      categoria: decodificar(campo(item, 'category').trim()),
      en: { titulo: decodificar(campo(item, 'title').trim()), resumen: resumir(aTexto(campo(item, 'content:encoded') || campo(item, 'description'))) },
    };
  }).filter(n => n.en.titulo && /^https:\/\/(www\.)?pokebeach\.com\//.test(n.url));
}

async function traducir(textos, clave){
  const base = clave.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = await fetch(base + '/v2/translate', {
    method: 'POST',
    headers: { 'Authorization': 'DeepL-Auth-Key ' + clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textos, source_lang: 'EN', target_lang: 'ES', preserve_formatting: true }),
  });
  if (!res.ok) throw new Error(`DeepL respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).translations.map(t => t.text);
}

async function main(){
  const i = process.argv.indexOf('--archivo');
  let xml;
  if (i > -1) xml = await readFile(process.argv[i + 1], 'utf8');
  else {
    const res = await fetch(FEED, { headers: { 'User-Agent': 'ByePass-noticias/1.0 (lector RSS, cada 3 horas)', 'Accept': 'application/rss+xml, application/xml' } });
    if (!res.ok) throw new Error(`El feed respondió ${res.status}`);
    xml = await res.text();
  }
  const nuevas = leerRss(xml)
    .filter(n => !n.categoria || /front page news/i.test(n.categoria))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, MAXIMO);
  if (!nuevas.length) throw new Error('El feed no trajo noticias: no se toca el archivo.');

  let previo = { noticias: [] };
  try { previo = JSON.parse(await readFile(SALIDA, 'utf8')); } catch { /* primera vez */ }
  const antes = new Map((previo.noticias || []).map(n => [n.id, n]));

  let clave = (process.env.DEEPL_API_KEY || '').trim();
  if (!clave) try {
    clave = (await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'deepl.env'), 'utf8')).match(/^DEEPL_API_KEY=(.+)$/m)?.[1].trim() || '';
  } catch { /* sin archivo local */ }
  let avisoTraduccion = '';
  for (const n of nuevas){
    const p = antes.get(n.id);
    // Se reutiliza la traducción si el texto en inglés no cambió (ahorra cuota de DeepL).
    if (p?.es && p.en?.titulo === n.en.titulo && p.en?.resumen === n.en.resumen){ n.es = p.es; if (p.revisado) n.revisado = p.revisado; continue; }
    n.es = null;
  }
  const faltan = nuevas.filter(n => !n.es);
  if (faltan.length && clave){
    try {
      const t = await traducir(faltan.flatMap(n => [n.en.titulo, n.en.resumen || '']), clave);
      faltan.forEach((n, k) => { n.es = { titulo: t[2 * k], resumen: t[2 * k + 1] }; });
    } catch (e){ avisoTraduccion = e.message; console.warn('No se pudo traducir:', e.message); }
  } else if (faltan.length) avisoTraduccion = 'Sin DEEPL_API_KEY: las noticias nuevas quedan solo en inglés.';

  const noticias = nuevas.map(({ categoria, ...n }) => n);
  if (JSON.stringify(noticias) === JSON.stringify(previo.noticias)){ console.log('Sin cambios en las noticias.'); return; }
  const salida = { fuente: { nombre: 'PokéBeach', url: 'https://www.pokebeach.com/' }, actualizado: new Date().toISOString(), noticias };
  await writeFile(SALIDA, JSON.stringify(salida, null, 1) + '\n');
  console.log(`Guardadas ${noticias.length} noticias (${noticias.filter(n => n.es).length} en español).` + (avisoTraduccion ? ' ' + avisoTraduccion : ''));
  if (avisoTraduccion && clave) process.exitCode = 1;   // con clave y sin traducción, que la tarea se marque con error
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
