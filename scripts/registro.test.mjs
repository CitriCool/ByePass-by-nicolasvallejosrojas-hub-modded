import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRegistro, perfilCompleto } from '../web/registro.js';

const datos = { nombre: 'Ana Vega', correo: 'ana@example.test', clave: 'FuerteSegura2026!',
  nacimiento: '1995-05-12', playerId: '', publico: false, invitacion: '' };
const fallo = code => Object.assign(new Error(code), { code });
function escenario(opciones = {}) {
  const estado = { user: null, perfil: null, altas: 0, escrituras: 0, bajas: 0, pendientes: new Map(), avisos: [], ...opciones };
  const api = {
    usuarioActual: () => estado.user,
    leerBeta: async () => { if (estado.falloBeta) throw fallo('network'); return !!estado.beta; },
    normalizarCodigo: c => c || '', validarInvitacion: async () => '',
    crearCuenta: async () => { estado.altas++; return estado.user = { uid: 'uid-prueba' }; },
    cambiarNombre: async () => { if (estado.falloNombre) throw fallo('auth/network-request-failed'); },
    guardarPerfil: async (u, p) => {
      estado.escrituras++;
      if (estado.escrituraLenta) return estado.escrituraLenta(p);
      if (estado.falloEscritura) throw fallo(estado.falloEscritura);
      estado.perfil = p;
      if (estado.respuestaPerdida) throw fallo('network');
    },
    leerPerfil: async () => { if (estado.falloLectura) throw fallo('network'); return estado.perfil; },
    borrarCuenta: async () => { estado.bajas++; if (estado.falloBaja) throw fallo('network'); estado.user = null; },
    verificarCorreo: async () => { if (estado.falloCorreo) throw fallo('network'); },
    avisar: t => estado.avisos.push(t),
    pendientes: { guardar: (u,p) => estado.pendientes.set(u,p), leer: u => estado.pendientes.get(u), quitar: u => estado.pendientes.delete(u) },
  };
  return { estado, api, servicio: crearRegistro(api, { espera: 30 }) };
}
test('registro completo: una identidad, perfil confirmado y ninguna contraseña persistida', async () => {
  const { estado, servicio } = escenario();
  const user = await servicio.registrar(datos);
  assert.equal(user.uid, 'uid-prueba'); assert.ok(perfilCompleto(estado.perfil));
  assert.equal(estado.altas, 1); assert.equal(estado.bajas, 0); assert.equal(estado.pendientes.size, 0);
  assert.ok(!JSON.stringify(estado.perfil).includes(datos.clave));
});
test('permiso denegado al guardar revierte solo la cuenta recién creada', async () => {
  const { estado, servicio } = escenario({ falloEscritura: 'PERMISSION_DENIED' });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/no-guardado' });
  assert.equal(estado.user, null); assert.equal(estado.bajas, 1); assert.equal(estado.perfil, null);
});
test('el fallo de updateProfile también entra en la reversión', async () => {
  const { estado, servicio } = escenario({ falloNombre: true });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/no-guardado' });
  assert.equal(estado.escrituras, 0); assert.equal(estado.user, null);
});
test('una respuesta perdida después del guardado no borra una cuenta válida', async () => {
  const { estado, servicio } = escenario({ respuestaPerdida: true });
  await servicio.registrar(datos);
  assert.ok(perfilCompleto(estado.perfil)); assert.equal(estado.bajas, 0); assert.equal(estado.altas, 1);
});
test('sin confirmación del servidor se conserva la identidad y se recupera con el mismo UID', async () => {
  const { estado, servicio } = escenario({ falloEscritura: 'network', falloLectura: true });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/pendiente' });
  const uid = estado.user.uid;
  assert.equal(estado.bajas, 0); assert.ok(!JSON.stringify(servicio.pendiente(uid)).includes(datos.clave));
  estado.falloEscritura = null; estado.falloLectura = false;
  await servicio.reanudar(servicio.pendiente(uid));
  assert.equal(estado.altas, 1); assert.equal(estado.user.uid, uid); assert.ok(perfilCompleto(estado.perfil));
});
test('si borrar Auth falla, no se oculta el problema y la cuenta se puede completar', async () => {
  const { estado, servicio } = escenario({ falloEscritura: 'PERMISSION_DENIED', falloBaja: true });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/pendiente' });
  assert.ok(estado.user); estado.falloEscritura = null;
  await servicio.reanudar(servicio.pendiente(estado.user.uid));
  assert.equal(estado.altas, 1); assert.ok(perfilCompleto(estado.perfil));
});
test('reintentar una escritura todavía pendiente no la duplica ni vuelve a sumar invitaciones', async () => {
  let confirmar;
  const { estado, servicio } = escenario({ beta: true });
  estado.escrituraLenta = perfil => new Promise(resolve => { confirmar = () => { estado.perfil = perfil; resolve(); }; });
  await assert.rejects(servicio.registrar({ ...datos, invitacion: 'CODIGO1234' }), { code: 'registro/pendiente' });
  const reintento = servicio.reanudar(servicio.pendiente(estado.user.uid));
  setImmediate(() => confirmar());
  await reintento;
  assert.equal(estado.escrituras, 1); assert.equal(estado.altas, 1);
});
test('no se crea ninguna identidad si no puede comprobarse la apertura de la beta', async () => {
  const { estado, servicio } = escenario({ falloBeta: true });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/no-disponible' });
  assert.equal(estado.altas, 0); assert.equal(estado.escrituras, 0);
});
test('dos envíos simultáneos no crean dos cuentas', async () => {
  const { estado, servicio } = escenario();
  const primero = servicio.registrar(datos);
  await assert.rejects(servicio.registrar(datos), { code: 'registro/en-curso' });
  await primero; assert.equal(estado.altas, 1);
});
test('recuperar un perfil ya completo no lo sobrescribe', async () => {
  const perfil = { nombre: 'Nombre guardado', nacimiento: '1990-01-01' };
  const { estado, servicio } = escenario({ user: { uid: 'existente' }, perfil });
  await servicio.reanudar({ ...datos, nombre: 'Otro nombre' });
  assert.deepEqual(estado.perfil, perfil); assert.equal(estado.escrituras, 0); assert.equal(estado.altas, 0);
});
test('el registro no crea ni elimina identidades si ya había una sesión abierta', async () => {
  const { estado, servicio } = escenario({ user: { uid: 'existente' } });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/sesion-activa' });
  assert.equal(estado.altas, 0); assert.equal(estado.bajas, 0);
});
test('el correo fallido deja un aviso y conserva el perfil correcto', async () => {
  const { estado, servicio } = escenario({ falloCorreo: true });
  await servicio.registrar(datos);
  assert.ok(perfilCompleto(estado.perfil)); assert.deepEqual(estado.avisos, ['verificacion-pendiente']);
});
test('rechazo de cupo después de prevalidar no deja una identidad nueva huérfana', async () => {
  const { estado, servicio } = escenario({ beta: true, falloEscritura: 'PERMISSION_DENIED' });
  await assert.rejects(servicio.registrar({ ...datos, invitacion: 'CODIGO1234' }), { code: 'beta/codigo' });
  assert.equal(estado.user, null); assert.equal(estado.bajas, 1);
});
test('después de recargar se recuperan los datos pendientes sin contraseña ni otro alta', async () => {
  const { estado, api, servicio } = escenario({ falloEscritura: 'network', falloLectura: true });
  await assert.rejects(servicio.registrar(datos), { code: 'registro/pendiente' });
  const uid = estado.user.uid, recargado = crearRegistro(api);
  assert.ok(recargado.pendiente(uid));
  assert.ok(!JSON.stringify(recargado.pendiente(uid)).includes(datos.clave));
  estado.falloEscritura = null; estado.falloLectura = false;
  await recargado.reanudar(recargado.pendiente(uid));
  assert.equal(estado.altas, 1); assert.equal(estado.user.uid, uid);
});
test('un rechazo al recuperar nunca elimina una identidad que ya existía', async () => {
  const { estado, servicio } = escenario({ user:{uid:'antiguo'}, falloEscritura:'PERMISSION_DENIED' });
  await assert.rejects(servicio.reanudar(datos), {code:'registro/pendiente'});
  assert.equal(estado.user.uid, 'antiguo'); assert.equal(estado.bajas, 0);
});
test('un correo ya ocupado no provoca bajas ni escrituras de perfiles', async () => {
  const { estado, api, servicio } = escenario();
  api.crearCuenta = async () => {throw fallo('auth/email-already-in-use');};
  await assert.rejects(servicio.registrar(datos), {code:'auth/email-already-in-use'});
  assert.equal(estado.bajas, 0); assert.equal(estado.escrituras, 0);
});
test('recuperar un perfil parcial conserva su fecha de alta, incluido el valor cero', async () => {
  const { estado, servicio } = escenario({user:{uid:'antiguo'},perfil:{nombre:'Ana Vega',creado:0}});
  await servicio.reanudar(datos);
  assert.equal(estado.perfil.creado,0); assert.equal(estado.altas,0);
});
