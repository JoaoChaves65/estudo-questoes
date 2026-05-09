import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** ESLint minimal: só JS/TS recomendados (sem react-hooks opcionais estritos para não exigir refactors grandes). */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', '**/tsconfig*.tsbuildinfo'],
  },
  {
    files: ['api/**/*.ts', 'src/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
);
