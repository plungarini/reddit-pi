/** @type {import('tailwindcss').Config} */

module.exports = {
	content: ['./src/ui/**/*.{ts,tsx,html}'],
	theme: {
		extend: {
			colors: {
				surface: '#0f0f0f',
				card: '#1a1a1a',
				border: '#2a2a2a',
				accent: '#ff4500',
				'accent-hover': '#e63e00',
			},
		},
	},
	plugins: [],
};
