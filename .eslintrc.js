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
		'brace-style': ['error', '1tbs'],
		'comma-dangle': ['error', 'never'],
		'object-curly-spacing': ['error', 'always'],
		'array-bracket-spacing': ['error', 'never'],
		'space-before-function-paren': [
			'error',
			{
				anonymous: 'always',
				named: 'never',
				asyncArrow: 'always'
			}
		],
		'keyword-spacing': 'error',
		'space-infix-ops': 'error',
		'no-trailing-spaces': 'error',
		'eol-last': 'error'
	},
	globals: {
		browser: 'readonly',
		chrome: 'readonly'
	}
};
