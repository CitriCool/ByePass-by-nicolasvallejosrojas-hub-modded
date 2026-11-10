// Comprueba en TCGdex que las cartas del memorice existen, coinciden en nombre y son Full Art.
// Requiere internet. Uso: npm run verify:cartas
import { readFile } from 'node:fs/promises';
const cartas = JSON.parse(await readFile(new URL('../web/memoria-pokemon.json', import.meta.url), 'utf8'));
const fullArt = /illustration|full art|secret|ultra|hyper|special/i;
let fallos = 0;
// TCGdex a veces responde 503: se reintenta con pausas antes de marcar un error.
async function pedir(url, opciones = {}) {
  for (let intento = 1; ; intento++) {
    const r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(15000) });
    if (r.status < 500 || intento === 4) return r;
    await new Promise(listo => setTimeout(listo, 1500 * intento));
  }
}
for (const c of cartas) {
  const linea = [c.id.padEnd(14), c.nombre.padEnd(12)];
  try {
    const r = await pedir('https://api.tcgdex.net/v2/en/cards/' + c.id);
    if (!r.ok) throw Error('la API respondió ' + r.status);
    const d = await r.json();
    const img = await pedir(c.imagen, { method: 'HEAD' });
    const ok = d.name === c.nombre && fullArt.test(d.rarity || '') && img.ok;
    if (!ok) fallos++;
    linea.push(ok ? 'OK ' : 'REVISAR', `TCGdex: ${d.name} · ${d.rarity} · imagen ${img.status}`);
  } catch (e) { fallos++; linea.push('ERROR', e.message); }
  console.log(linea.join('  '));
}
console.log(fallos ? `\n${fallos} carta(s) por revisar.` : '\nLas seis cartas son Full Art y sus imágenes responden.');
process.exitCode = fallos ? 1 : 0;
