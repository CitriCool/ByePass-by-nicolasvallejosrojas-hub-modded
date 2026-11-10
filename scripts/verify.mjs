import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import { root } from './server.mjs';

const results = [];
const ok = message => { results.push(message); console.log('OK:', message); };
const original = path.join(root, '../timertorneosbyepass-main/timertorneosbyepass-main');
const hashes = JSON.parse(await readFile(path.join(root, 'original-sha256.json'), 'utf8'));
for (const [filename, hash] of Object.entries(hashes)) {
  assert.equal(createHash('sha256').update(await readFile(path.join(original, filename))).digest('hex'), hash, filename);
}
assert.equal((await readdir(original)).length, Object.keys(hashes).length);
ok('Los 61 archivos originales conservan su contenido.');
for (const filename of await readdir(path.join(root, 'web'))) {
  if (!/\.(html|js|json|webmanifest)$/.test(filename)) continue;
  assert.ok(!(await readFile(path.join(root, 'web', filename), 'utf8')).includes('timer-y-qrs-pokemon'), filename);
}
ok('La copia no contiene referencias al proyecto Firebase original.');
const config = await readFile(path.join(root, 'web/config.js'), 'utf8');
for (const search of ['', '?emu=0', '?emu=1']) {
  const document = { head: { appendChild() {} }, documentElement: { classList: { add() {} } }, createElement: () => ({}) };
  const window = {}; window.top = window.self = window;
  const context = vm.createContext({ location: { hostname: '127.0.0.1', pathname: '/', search },
    document, window, navigator: {}, addEventListener() {}, URLSearchParams });
  vm.runInContext(config, context);
  assert.equal(vm.runInContext('EMULADOR.db', context), 9000);
  assert.equal(vm.runInContext('FIREBASE_CONFIG.projectId', context), 'demo-byepass');
}
ok('El emulador es obligatorio, incluso con ?emu=0 o sin parámetros.');
const response = await fetch('http://127.0.0.1:8001');
assert.equal(response.status, 200);
const policy = response.headers.get('content-security-policy');
const connect = policy.split(';').find(s => s.trim().startsWith('connect-src'));
assert.ok(connect.includes('127.0.0.1:9000') && connect.includes('127.0.0.1:9099'));
assert.ok(!/https:|firebaseio|googleapis|\*/.test(connect));
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.ok((await response.text()).includes('ByePass'));
ok('La web responde y su CSP solo permite conexiones de datos locales.');
const shortLink = await fetch('http://127.0.0.1:8001/abc234');
assert.ok((await shortLink.text()).includes('http://127.0.0.1:9000'));
assert.equal((await fetch('http://127.0.0.1:8001/sw.js')).status, 404);
ok('Los enlaces cortos usan el emulador y el service worker está desactivado.');
const hub = await (await fetch('http://127.0.0.1:4400/emulators')).json();
assert.equal(hub.auth.host, '127.0.0.1'); assert.equal(hub.database.host, '127.0.0.1');
ok('Authentication y Realtime Database escuchan solo en 127.0.0.1.');
const marker = `__verificacion_local/${Date.now()}`;
const url = `http://127.0.0.1:9000/${marker}.json?ns=demo-byepass-default-rtdb`;
try {
  assert.ok((await fetch(url, { method: 'PUT', body: JSON.stringify({ prueba: 'solo local' }) })).ok);
  assert.deepEqual(await (await fetch(url)).json(), { prueba: 'solo local' });
} finally { assert.ok((await fetch(url, { method: 'DELETE' })).ok); }
ok('Lectura, escritura y borrado comprobados únicamente en el emulador.');
for (const email of ['organizador@example.test', 'jugador@example.test']) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-byepass-local-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'PruebaLocal2026!', returnSecureToken: true }) });
  const data = await r.json(); assert.ok(r.ok, JSON.stringify(data)); assert.equal(data.email, email);
}
ok('Ambas cuentas ficticias permiten iniciar sesión en Authentication local.');
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data/verification.json'), JSON.stringify({ fecha: new Date().toISOString(), resultados: results }, null, 2));
console.log('Verificación completa. No se consultó la base original.');
