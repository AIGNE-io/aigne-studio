const { join } = require('path');

module.exports = {
  root: true,
  extends: '@arcblock/eslint-config-ts',
  parserOptions: {
    project: [
      join(__dirname, 'tsconfig.eslint.json'),
      join(__dirname, 'blocklets/ai-studio/tsconfig.json'),
      join(__dirname, 'packages/co-git/tsconfig.json'),
      join(__dirname, 'packages/prompt-editor/tsconfig.json'),
    ],
  },
  rules: {
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react/require-default-props': 'off',
    'react/no-array-index-key': 'warn',
    'no-return-assign': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'warn',
    'no-nested-ternary': 'off',
    '@typescript-eslint/no-loop-func': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/comma-dangle': 'off',
    'require-await': 'off',
    'max-classes-per-file': 'off',
    'no-param-reassign': 'off',
  },
};
