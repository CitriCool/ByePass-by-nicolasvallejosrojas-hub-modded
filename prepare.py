"""Prepara únicamente la copia local; nunca escribe en el proyecto original."""
from pathlib import Path
import hashlib
import json
import re
import shutil

root = Path(__file__).resolve().parent
source = root.parent / 'timertorneosbyepass-main' / 'timertorneosbyepass-main'
web = root / 'web'
if web.exists():
    raise SystemExit('La copia web ya existe; no se sobrescribe para conservar tus cambios.')
shutil.copytree(source, web)
hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in source.iterdir() if p.is_file()}
(root / 'original-sha256.json').write_text(json.dumps(hashes, indent=2), encoding='utf-8')

# Sustituye todas las referencias de Firebase originales de la copia.
replacements = {
    'timer-y-qrs-pokemon-default-rtdb.firebaseio.com': 'demo-byepass-default-rtdb.firebaseio.com',
    'timer-y-qrs-pokemon.firebaseapp.com': 'demo-byepass.firebaseapp.com',
    'timer-y-qrs-pokemon.firebasestorage.app': 'demo-byepass.firebasestorage.app',
    'timer-y-qrs-pokemon': 'demo-byepass',
    '551925622696': '123456789000',
    '1:123456789000:web:0bb0195d153fe7c64f9f9d': '1:123456789000:web:localtests',
}
for p in web.iterdir():
    if p.suffix not in {'.html', '.js', '.json', '.webmanifest'}:
        continue
    content = p.read_text(encoding='utf-8')
    for old, new in replacements.items():
        content = content.replace(old, new)
    # Cualquier clave web de Firebase del original se reemplaza por la ficticia.
    content = re.sub(r'AIza[0-9A-Za-z_\-]{35}', 'demo-byepass-local-key', content)
    p.write_text(content, encoding='utf-8')

p = web / 'config.js'
content = p.read_text(encoding='utf-8')
start = content.index('const EMULADOR = (function(){')
end = content.index('})();', start) + len('})();')
content = content[:start] + '''// Entorno de pruebas obligatorio: ?emu=0 NO puede desactivarlo.
if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
  throw new Error("Esta copia solo puede ejecutarse en localhost.");
}
const EMULADOR = Object.freeze({ host: "127.0.0.1", auth: 9099, db: 9000 });
''' + content[end:]
# El servidor local no instala caché persistente: evita reutilizar versiones antiguas.
content = content.replace('navigator.serviceWorker.register("sw.js").catch(function(){});',
    'navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));')
p.write_text(content, encoding='utf-8')
p = web / '404.html'
content = p.read_text(encoding='utf-8').replace(
    'https://demo-byepass-default-rtdb.firebaseio.com', 'http://127.0.0.1:9000')
content = content.replace('codigo + ".json"', 'codigo + ".json?ns=demo-byepass-default-rtdb"')
p.write_text(content, encoding='utf-8')
print('Copia aislada creada en', web)
