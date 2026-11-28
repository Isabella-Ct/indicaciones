// Utilidades de prueba: app de Express y tokens por rol (usuarios de seed.sql).
const request = require('supertest');
const { crearApp } = require('../../src/app');

const app = crearApp();

const CREDENCIALES = {
  admin: { tipoDocumento: 'CC', numeroDocumento: '1000000001', contrasena: 'Admin2026*' },
  operador: { tipoDocumento: 'CC', numeroDocumento: '1000000002', contrasena: 'Operador2026*' },
  supervisor: { tipoDocumento: 'CC', numeroDocumento: '1000000003', contrasena: 'Operador2026*' },
  cliente: { tipoDocumento: 'CC', numeroDocumento: '1000000004', contrasena: 'Cliente2026*' },
  inactivo: { tipoDocumento: 'CC', numeroDocumento: '1000000009', contrasena: 'Cliente2026*' },
};

/** Inicia sesión y devuelve { token, permisos, usuario }. */
async function sesionDe(quien) {
  const res = await request(app).post('/api/v1/auth/login').send(CREDENCIALES[quien]);
  if (res.status !== 200) throw new Error(`Login de ${quien} falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function tokenDe(quien) {
  return (await sesionDe(quien)).token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Nombre único para datos creados por una prueba. */
const unico = (base) => `${base} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.slice(0, 40);

module.exports = { app, request, CREDENCIALES, sesionDe, tokenDe, auth, unico };
