// eslint.config.js
const tsEslintPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    // Apply these settings to JavaScript and TypeScript files
    files: ['**/*.{js,ts,tsx}'],
    // Use the following files to be ignored
    ignores: [
      'coverage/**/*',
      'artifacts/**/*',
      'cache/**/*',
      'typechain-types/**/*', // generated files from typechain
      'eslint.config.js', // avoid self linting
    ],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        tsconfigRootDir: __dirname,
        // Use your TSConfig that includes your project's sources.
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Recommended rules from the @typescript-eslint plugin (including type-checking rules)
      ...tsEslintPlugin.configs.recommended.rules,
      ...tsEslintPlugin.configs['recommended-requiring-type-checking'].rules,

      // Recommended rules for prettier
      ...prettierPlugin.configs.recommended.rules,
    },
  },
];
