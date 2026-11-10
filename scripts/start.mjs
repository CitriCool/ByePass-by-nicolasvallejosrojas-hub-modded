import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { root, startServer } from './server.mjs';

process.chdir(root);
await import('./versionar.mjs');
const env = { ...process.env };
// CLI y cachés quedan dentro de tests; nunca utiliza credenciales de Firebase.
env.FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true';
env.FIREBASE_EMULATORS_PATH = path.join(root, 'tools', 'emulators');
env.GOOGLE_APPLICATION_CREDENTIALS = path.join(root, 'NO-CREDENTIALS-LOCAL-ONLY.json');
delete env.FIREBASE_TOKEN;
const portable = path.join(root, 'tools', 'java');
let javaHome = existsSync(portable) ? readdirSync(portable).map(n => path.join(portable, n))
  .find(p => existsSync(path.join(p, 'bin', 'java.exe'))) : undefined;
if (!javaHome && existsSync('C:/Program Files/Android/Android Studio/jbr/bin/java.exe'))
  javaHome = 'C:/Program Files/Android/Android Studio/jbr';
if (javaHome) { env.JAVA_HOME = javaHome; env.PATH = path.join(javaHome, 'bin') + path.delimiter + env.PATH; }
const cli = path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js');
if (!existsSync(cli)) throw new Error('Falta Firebase CLI. Consulta README.md.');
// No reutilizar servicios ajenos que ya ocupen los puertos.
for (const port of [8001, 9000, 9099, 4000, 4400, 4500]) {
  await new Promise((resolve, reject) => {
    const s = net.createServer(); s.once('error', () => reject(new Error(`El puerto ${port} ya está ocupado.`)));
    s.listen(port, '127.0.0.1', () => s.close(resolve));
  });
}
mkdirSync(env.FIREBASE_EMULATORS_PATH, { recursive: true });
const args = [cli, 'emulators:start', '--only', 'auth,database', '--project', 'demo-byepass',
  '--config', 'firebase.json', '--export-on-exit', 'data/snapshot'];
if (existsSync('data/snapshot/firebase-export-metadata.json')) args.push('--import', 'data/snapshot');
const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
let server;
let stopping = false;
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true; stopping = true;
  server?.close();
  if (ready) {
    console.log('\nGuardando datos locales antes de detener...');
    const code = await new Promise(resolve => {
      const exporter = spawn(process.execPath, [cli, 'emulators:export', 'data/snapshot', '--force',
        '--project', 'demo-byepass', '--config', 'firebase.json'], { cwd: root, env, stdio: 'inherit', windowsHide: true });
      exporter.on('exit', resolve); exporter.on('error', () => resolve(1));
    });
    if (code !== 0) console.error('No se pudo guardar la sesión; revisa los mensajes anteriores.');
  }
  if (process.platform === 'win32') {
    // Windows no envía SIGINT con child.kill: termina únicamente este árbol tras exportar.
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => child.kill());
  } else child.kill('SIGINT');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
child.on('exit', code => { stopping = true; server?.close(); process.exitCode = code || 0; });
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
let ready = false;
for (let attempt = 0; attempt < 180 && !stopping; attempt++) {
  try {
    const result = await fetch('http://127.0.0.1:4400/emulators', { signal: AbortSignal.timeout(1000) });
    const services = await result.json();
    if (services.auth && services.database) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (ready && !stopping) {
  server = await startServer();
  console.log('\nWEB LOCAL: http://127.0.0.1:8001\nEMULADORES: http://127.0.0.1:4000\n');
  console.log('Primera vez: abre otra terminal en tests y ejecuta npm.cmd run seed.');
} else if (!stopping) {
  console.error('No arrancaron los emuladores. La web no se sirve para evitar pruebas incompletas.');
  child.kill('SIGINT'); process.exitCode = 1;
}
