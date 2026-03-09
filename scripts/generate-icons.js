const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');

const sourceImage = path.join(__dirname, '../src/ui/assets/logo_4k.png');
const outputDir = path.join(__dirname, '../src/ui/public');

if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
	try {
		console.log('Generating PWA icons...');

		// icon-192.png
		await sharp(sourceImage).resize(192, 192).png().toFile(path.join(outputDir, 'icon-192.png'));

		// icon-512.png
		await sharp(sourceImage).resize(512, 512).png().toFile(path.join(outputDir, 'icon-512.png'));

		// favicon.png (32x32) with 8px border radius
		const faviconSize = 32;
		const radius = 8;
		const mask = Buffer.from(
			`<svg><rect x="0" y="0" width="${faviconSize}" height="${faviconSize}" rx="${radius}" ry="${radius}"/></svg>`,
		);

		await sharp(sourceImage)
			.resize(faviconSize, faviconSize)
			.composite([{ input: mask, blend: 'dest-in' }])
			.png()
			.toFile(path.join(outputDir, 'favicon.png'));

		// apple-touch-icon.png (180x180)
		await sharp(sourceImage).resize(180, 180).png().toFile(path.join(outputDir, 'apple-touch-icon.png'));

		console.log('Icons generated successfully in src/ui/public/');
	} catch (err) {
		console.error('Error generating icons:', err);
		process.exit(1);
	}
}

generateIcons();
