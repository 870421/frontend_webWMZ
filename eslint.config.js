import eslintConfigPrettier from 'eslint-config-prettier/flat';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import airbnb from 'eslint-stylistic-airbnb';

const sourceFiles = ['src/**/*.{js,jsx}'];

const browserGlobals = {
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  DOMException: 'readonly',
  ResizeObserver: 'readonly',
  URLSearchParams: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  navigator: 'readonly',
  window: 'readonly',
};

const jestGlobals = {
  afterEach: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  global: 'readonly',
  it: 'readonly',
  jest: 'readonly',
  test: 'readonly',
};

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  {
    ...airbnb.configs['flat/recommended'],
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      sourceType: 'module',
    },
  },
  {
    ...airbnb.configs['flat/addon-jsx'],
    files: ['src/**/*.jsx'],
  },
  {
    ...airbnb.configs['flat/addon-import'],
    files: sourceFiles,
    plugins: {
      'import-x': importX,
    },
    rules: {
      ...airbnb.configs['flat/addon-import'].rules,
      'import-x/extensions': ['error', 'ignorePackages', { js: 'always', jsx: 'never' }],
      'import-x/prefer-default-export': 'off',
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: sourceFiles,
  },
  {
    // The loading flag intentionally resets when the debounced search query changes.
    files: ['src/features/route-search/usePlaceAutocomplete.js'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/tests/**/*.js'],
    languageOptions: {
      globals: jestGlobals,
    },
    plugins: {
      ...airbnb.configs['flat/recommended'].plugins,
      'import-x': importX,
    },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-underscore-dangle': 'off',
    },
  },
  {
    files: ['src/tests/fileMock.js', 'src/tests/styleMock.js'],
    languageOptions: {
      globals: { module: 'readonly' },
      sourceType: 'commonjs',
    },
  },
  {
    ...airbnb.configs['flat/recommended'],
    files: ['vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { process: 'readonly' },
      sourceType: 'module',
    },
    plugins: {
      ...airbnb.configs['flat/recommended'].plugins,
      'import-x': importX,
    },
    rules: {
      ...airbnb.configs['flat/recommended'].rules,
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
  eslintConfigPrettier,
];
