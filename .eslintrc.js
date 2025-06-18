module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
		webextensions: true,
		jest: true
	},
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module'
	},
	rules: {
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
		'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'no-console': 'warn',
		'no-debugger': 'error',
		'prefer-const': 'error',
		'no-var': 'error',
		eqeqeq: 'error',
		curly: 'error',
		'prettier/prettier': 'warn'
	},
	globals: {
		browser: 'readonly',
		chrome: 'readonly'
	}
};
