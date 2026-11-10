import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { root } from './server.mjs';

for (const port of [9003,9093,4403,4503,5003]) await new Promise((resolve,reject) => {
  const s = net.createServer(); s.once('error', () => reject(new Error(`Puerto ${port} ocupado: no se reutiliza un entorno ajeno.`)));
  s.listen(port,'127.0.0.1',() => s.close(resolve));
});
const java = path.join(root,'tools/java');
const home = readdirSync(java).map(n => path.join(java,n)).find(p => existsSync(path.join(p,'bin/java.exe')));
if (!home) throw new Error('Falta Java portátil en tests/tools/java.');
const env = { ...process.env, JAVA_HOME:home, PATH:path.join(home,'bin')+path.delimiter+process.env.PATH,
  FIREBASE_EMULATORS_PATH:path.join(root,'tools/emulators'), FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',
  GOOGLE_APPLICATION_CREDENTIALS:path.join(root,'NO-CREDENTIALS-LOCAL-ONLY.json') };
delete env.FIREBASE_TOKEN;
const args = [path.join(root,'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only',process.argv.includes('--sistema') ? 'auth,database,functions' : 'auth,database',
  '--project','demo-byepass-registro','--config',...(process.argv.includes('--sistema') ? ['firebase.sistema.json','node scripts/test-sistema-emuladores.mjs'] : ['firebase.registro.json','node scripts/test-registro-emuladores.mjs'])];
const child = spawn(process.execPath,args,{cwd:root,env,stdio:'inherit',windowsHide:true});
child.on('error', e => {console.error(e.message);process.exitCode=1;});
child.on('exit', code => {process.exitCode=code || 0;});
