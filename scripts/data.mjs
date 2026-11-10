import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { root } from './server.mjs';
import path from 'node:path';
const db = 'http://127.0.0.1:9000';
const auth = 'http://127.0.0.1:9099';
const ns = 'demo-byepass-default-rtdb';
async function request(url, method = 'GET', body, headers = {}) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const value = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(value));
  return value;
}
async function backup() {
  const value = await request(`${db}/.json?ns=${ns}`);
  await mkdir(path.join(root, 'data/backups'), { recursive: true });
  const file = path.join(root, 'data/backups', `${Date.now()}.json`);
  await writeFile(file, JSON.stringify(value, null, 2));
  return value;
}
async function account(email, displayName) {
  const users = await request(`${auth}/identitytoolkit.googleapis.com/v1/projects/demo-byepass/accounts:query`, 'POST', {}, { Authorization: 'Bearer owner' });
  const existing = (users.userInfo || []).find(u => u.email === email);
  let user = existing;
  if (!user) user = await request(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-byepass-local-key`,
    'POST', { email, password: 'PruebaLocal2026!', displayName, returnSecureToken: true });
  await request(`${auth}/identitytoolkit.googleapis.com/v1/projects/demo-byepass/accounts:update`,
    'POST', { localId: user.localId, displayName, emailVerified: true }, { Authorization: 'Bearer owner' });
  return user.localId;
}
const mode = process.argv[2];
if (mode === 'seed') {
  const current = await backup();
  if (current?.tiendas?.['tienda-test']) {
    console.log('La tienda ficticia ya existe; se conservan sus cambios.');
    process.exit(0);
  }
  const owner = await account('organizador@example.test', 'Organizador de pruebas');
  const player = await account('jugador@example.test', 'Jugador de pruebas');
  const now = Date.now();
  const changes = {
    [`usuarios/${owner}`]: { nombre: 'Organizador de pruebas', nacimiento: '1990-01-01', creado: now, publico: false },
    [`usuarios/${player}`]: { nombre: 'Jugador de pruebas', nacimiento: '1995-01-01', creado: now, publico: false, playerId: '1234567' },
    [`admins/${owner}`]: true,
    [`organiza/${owner}/tienda-test`]: 'dueno',
    'tiendas/tienda-test': { perfil: { nombre: 'Tienda de pruebas', comuna: 'Santiago', color: '#0B7F6C', creada: now },
      verificada: true, miembros: { [owner]: { rol: 'dueno', nombre: 'Organizador de pruebas', desde: now } } },
    'salas/tienda-test/owner': owner,
    'salas/tienda-test/nombre': 'Torneo de pruebas',
  };
  await request(`${db}/.json?ns=${ns}`, 'PATCH', changes);
  console.log('Datos ficticios cargados. Contraseña de ambas cuentas: PruebaLocal2026!');
  console.log('organizador@example.test / jugador@example.test');
} else if (mode === 'import') {
  const filename = process.argv[3];
  if (!filename) throw new Error('Uso: npm.cmd run import:database -- "C:\\ruta\\exportacion.json"');
  const value = JSON.parse(await readFile(path.resolve(filename), 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Se espera el objeto JSON de Realtime Database.');
  await backup();
  await request(`${db}/.json?ns=${ns}`, 'PUT', value);
  console.log('JSON importado SOLO en el emulador local. Los datos anteriores tienen copia en data/backups.');
  console.log('Authentication y las reglas originales se importan por separado.');
} else throw new Error('Acción desconocida. Usa seed o import.');
