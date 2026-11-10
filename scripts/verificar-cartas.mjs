// Comprueba en TCGdex que las cartas del memorice existen, coinciden en nombre y son Full Art.
// Requiere internet. Uso: npm run verify:cartas
import { readFile } from 'node:fs/promises';
const cartas = JSON.parse(await readFile(new URL('../web/memoria-pokemon.json', import.meta.url), 'utf8'));
const fullArt = /illustration|full art|secret|ultra|hyper|special/i;
let fallos = 0;
for (const c of cartas) {
  const linea = [c.id.padEnd(14), c.nombre.padEnd(12)];
  try {
    const r = await fetch('https://api.tcgdex.net/v2/en/cards/' + c.id, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error('la API respondió ' + r.status);
    const d = await r.json();
    const img = await fetch(c.imagen, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    const ok = d.name === c.nombre && fullArt.test(d.rarity || '') && img.ok;
    if (!ok) fallos++;
    linea.push(ok ? 'OK ' : 'REVISAR', `TCGdex: ${d.name} · ${d.rarity} · imagen ${img.status}`);
  } catch (e) { fallos++; linea.push('ERROR', e.message); }
  console.log(linea.join('  '));
}
console.log(fallos ? `\n${fallos} carta(s) por revisar.` : '\nLas seis cartas son Full Art y sus imágenes responden.');
process.exitCode = fallos ? 1 : 0;
