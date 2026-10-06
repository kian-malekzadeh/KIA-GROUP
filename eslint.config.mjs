import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------
// Department isolation (kia-group/*): each department is a standalone
// "project". A department may depend on the platform kernel
// (@kia-group/platform) and the shared contracts (@kia-group/shared, brand,
// permissions) — but NEVER on another department, and never on the app
// shells (@kia-group/api / @kia-group/group). Cross-department communication
// goes through the platform (domain-events bus) or @kia-group/shared.
const DEPARTMENTS = [
  'kia-academy',
  'kia-work',
  'kia-material',
  'kia-lab',
  'kia-event',
  'kia-community',
];

const isolationMessage = (dept, other) =>
  `Cross-department import blocked: ${dept} must not depend on ${other}. ` +
  'Departments are isolated — use @kia-group/platform (domain events) or @kia-group/shared contracts.';

const departmentIsolation = [
  ...DEPARTMENTS.map((dept) => ({
    files: [`kia-group/${dept}/**/*.{ts,tsx,mjs,js}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...DEPARTMENTS.filter((d) => d !== dept).map((d) => ({
              name: `@kia-group/${d}`,
              message: isolationMessage(dept, d),
            })),
            { name: '@kia-group/api', message: isolationMessage(dept, '@kia-group/api (the API shell)') },
            { name: '@kia-group/group', message: isolationMessage(dept, '@kia-group/group (the web shell)') },
          ],
          patterns: [
            ...DEPARTMENTS.filter((d) => d !== dept).map((d) => ({
              group: [`@kia-group/${d}`, `@kia-group/${d}/*`],
              message: isolationMessage(dept, d),
            })),
            {
              // Relative escapes into a sibling department folder.
              group: ['../kia-*', '../kia-*/**', '../**/kia-*', '../**/kia-*/**'],
              message: `Cross-department import blocked in ${dept}: reference departments by package name only, never by relative path.`,
            },
          ],
        },
      ],
    },
  })),
  {
    // The kernel can never point back at a department or an app shell.
    files: ['packages/platform/**/*.{ts,tsx,mjs,js}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...DEPARTMENTS.map((d) => ({
              name: `@kia-group/${d}`,
              message: `The platform kernel must stay dependency-free: remove the import of ${d}.`,
            })),
            { name: '@kia-group/api', message: 'The platform kernel must never import the API shell.' },
            { name: '@kia-group/group', message: 'The platform kernel must never import the web shell.' },
          ],
        },
      ],
    },
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/src/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
    },
  },
  ...departmentIsolation,
);
