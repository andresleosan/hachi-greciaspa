import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const sourceFiles = ['src/**/*.{ts,tsx,mts,cts}']
const toolFiles = ['tools/**/*.{ts,tsx,mts,cts}']

export default tseslint.config(
  {
    ignores: [
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '**/*.json',
      '**/*.html',
      '**/*.css',
      '**/*.md',
      '.worktrees/**',
      'dist/**',
      'node_modules/**',
      '.superpowers/**',
      'coverage/**',
      'functions/**',
      'qa/**',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: [...sourceFiles, ...toolFiles],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: toolFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
)
