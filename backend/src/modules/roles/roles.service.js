const repo = require('./roles.repository');

async function listar() {
  return repo.listar();
}

module.exports = { listar };
