import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'src/scripts/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      'no-unused-vars': 'warn',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-debugger': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
