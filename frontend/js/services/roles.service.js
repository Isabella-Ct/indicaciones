import { get } from './api.js';

export async function listarRoles() {
  return (await get('/roles')).data;
}
