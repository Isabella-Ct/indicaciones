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
  HTMLDialogElement: 'readonly',
  AbortController: 'readonly',
  DOMException: 'readonly',
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

// Atomic Design (constitución §V): un componente solo importa niveles inferiores y nunca la capa
// de servicios (los componentes no llaman a la API; lo hacen las páginas en js/views).
const SIN_SERVICIOS = { group: ['**/services/*'], message: 'Los componentes no llaman a la API: hágalo desde la página (js/views).' };
const nivelesProhibidos = (niveles) => ({
  group: niveles.map((n) => `**/components/${n}/*`).concat(niveles.map((n) => `../${n}/*`)),
  message: 'Atomic Design: un componente solo puede importar componentes de niveles inferiores.',
});
const reglaAtomica = (niveles) => ({
  'no-restricted-imports': [
    'error',
    { patterns: niveles.length ? [SIN_SERVICIOS, nivelesProhibidos(niveles)] : [SIN_SERVICIOS] },
  ],
});

module.exports = [
  {
    ignores: ['**/node_modules/**', 'backend/uploads/**', 'backend/coverage/**', 'backend/docs/**', 'docs/**'],
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
      // Constitución §V: datos externos solo con textContent (nunca HTML interpretado).
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Usa textContent o <template> (constitución §V).' },
        { property: 'outerHTML', message: 'Usa textContent o <template> (constitución §V).' },
        { property: 'insertAdjacentHTML', message: 'Usa textContent o <template> (constitución §V).' },
      ],
    },
  },
  { files: ['frontend/js/components/atomos/**/*.js'], rules: reglaAtomica(['moleculas', 'organismos', 'plantillas']) },
  { files: ['frontend/js/components/moleculas/**/*.js'], rules: reglaAtomica(['organismos', 'plantillas']) },
  { files: ['frontend/js/components/organismos/**/*.js'], rules: reglaAtomica(['plantillas']) },
  { files: ['frontend/js/components/plantillas/**/*.js'], rules: reglaAtomica([]) },
];
