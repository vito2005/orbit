import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sveltePlugin from 'eslint-plugin-svelte'
import globals from 'globals'
import svelteParser from 'svelte-eslint-parser'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/.svelte-kit/**',
            '**/build/**',
            '**/dist/**',
            '**/.output/**',
            'bun.lock',
            'bun.lockb',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...sveltePlugin.configs['flat/recommended'],
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.browser,
                Bun: 'readonly',
            },
        },
        plugins: {
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                },
            ],
            'simple-import-sort/imports': 'warn',
            'simple-import-sort/exports': 'warn',
            'no-undef': 'off',
            'prefer-const': 'warn',
        },
    },
    {
        // *.svelte.ts are rune-enabled modules — the svelte parser claims them,
        // so it needs the TS parser nested inside or their types fail to parse.
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.svelte'],
                svelteFeatures: { runes: true },
            },
        },
        rules: {
            'svelte/no-at-html-tags': 'warn',
            'svelte/require-each-key': 'warn',
            // We don't use the $app/paths resolve() helper — internal hrefs are
            // plain strings, by design.
            'svelte/no-navigation-without-resolve': 'off',
        },
    },
]
