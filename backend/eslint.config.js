// ESLint (flat config). Se ejecuta desde la raíz del repo: ver script "lint" en package.json.
const js = require('@eslint/js');

const globalesNode = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

const globalesJest = {
  describe: 'readonly',
  test: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

const globalesNavegador = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  history: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  Intl: 'readonly',
  HTMLElement: 'readonly',
  Node: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  KeyboardEvent: 'readonly',
  EventSource: 'readonly',
};

const reglasComunes = {
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
};

module.exports = [
  {
    ignores: ['**/node_modules/**', 'backend/uploads/**', 'backend/coverage/**', 'docs/**'],
  },
  js.configs.recommended,
  {
    files: ['backend/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: globalesNode },
    rules: reglasComunes,
  },
  {
    files: ['backend/tests/**/*.js'],
    languageOptions: { globals: { ...globalesNode, ...globalesJest } },
  },
  {
    files: ['frontend/js/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globalesNavegador },
    rules: {
      ...reglasComunes,
      // Regla del proyecto: nunca innerHTML con datos (usar textContent / nodos).
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Usa textContent o crea nodos (CLAUDE.md §5.2).' },
        { property: 'outerHTML', message: 'Usa textContent o crea nodos (CLAUDE.md §5.2).' },
      ],
    },
  },
];
