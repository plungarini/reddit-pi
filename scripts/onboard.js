const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline/promises');

console.log('🚀 Starting reddit-pi interactive onboarding...\n');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

async function extractCookiesAuto() {
	console.log('\n🌐 Launching browser for Reddit login...');
	console.log('👉 Please log in to your account. I will automatically grab the cookies once you are in.');

	let browser;
	try {
		const puppeteer = require('puppeteer');
		browser = await puppeteer.launch({ headless: false, defaultViewport: null });
		const page = await browser.newPage();
		await page.goto('https://www.reddit.com/login');

		let tokenV2 = '';
		let redditSession = '';

		// Poll for cookies every second
		while (!tokenV2 || !redditSession) {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const cookies = await page.cookies('https://www.reddit.com');
			for (const c of cookies) {
				if (c.name === 'token_v2') tokenV2 = c.value;
				if (c.name === 'reddit_session') redditSession = c.value;
			}
		}

		console.log('\n✅ Successfully extracted Reddit session cookies!');
		await browser.close();

		return { tokenV2, redditSession };
	} catch (err) {
		console.error('\n❌ Failed to automatically extract cookies:', err.message);
		if (browser) await browser.close();
		return null;
	}
}

async function run() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	let existingEnv = {};
	if (fs.existsSync(envPath)) {
		const currentContent = fs.readFileSync(envPath, 'utf8');
		currentContent.split('\n').forEach((line) => {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				const [k, ...rest] = trimmed.split('=');
				if (k) existingEnv[k] = rest.join('=');
			}
		});
	}

	console.log('Do you want to automatically extract Reddit auth cookies using a browser?');
	console.log('[1] Yes, let me log in and grab them automatically (Recommended)');
	console.log('[2] No, I will paste them manually');
	const modeAnswer = await rl.question('Select an option (1/2) [1]: ');
	const useAutoExtract = modeAnswer.trim() === '1' || modeAnswer.trim() === '';

	if (useAutoExtract) {
		const autoCookies = await extractCookiesAuto();
		if (autoCookies) {
			existingEnv['REDDIT_TOKEN_V2'] = autoCookies.tokenV2;
			existingEnv['REDDIT_SESSION'] = autoCookies.redditSession;
		} else {
			console.log('Reverting to manual input...');
		}
	}

	if (fs.existsSync(envExamplePath)) {
		const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
		const lines = exampleContent.split('\n');

		const saveProgress = () => {
			let out = '';
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) {
					out += line + '\n';
					continue;
				}
				const [key, ...rest] = trimmed.split('=');
				const val = existingEnv[key] !== undefined ? existingEnv[key] : rest.join('=');
				out += `${key}=${val}\n`;
			}
			fs.writeFileSync(envPath, out);
		};

		rl.on('SIGINT', () => {
			console.log('\n\n🛑 Onboarding interrupted. Saving progress...');
			saveProgress();
			console.log('💾 Progress saved to .env\n');
			process.exit(0);
		});

		console.log("\n📝 Let's configure your environment variables.");
		console.log('Hit [Enter] to use the suggested default.\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			const [key, ...rest] = trimmed.split('=');
			const defaultValue = existingEnv[key] !== undefined ? existingEnv[key] : rest.join('=');

			// If we automatically extracted these and we have them, don't force the user to press enter
			if (useAutoExtract && (key === 'REDDIT_TOKEN_V2' || key === 'REDDIT_SESSION') && existingEnv[key]) {
				console.log(`✅ Auto-filled ${key}`);
				continue; // already in existingEnv
			}

			const answer = await rl.question(`${key} [${defaultValue}]: `);
			const finalValue = answer.trim() !== '' ? answer : defaultValue;
			existingEnv[key] = finalValue;
		}
		saveProgress();
	} else {
		console.error('❌ .env.example not found! Please create it first.');
		process.exit(1);
	}

	console.log('\n✅ .env configured successfully!\n');
	rl.close();

	// 2. Setup database directory
	const dataDir = path.join(projectRoot, 'data');
	if (!fs.existsSync(dataDir)) {
		console.log('📂 Creating data directory...');
		fs.mkdirSync(dataDir, { recursive: true });
		console.log('✅ Data directory created.\n');
	}

	// 3. Initialize Database and run tests
	console.log('⏳ Running integration tests to verify your live Reddit credentials...');
	try {
		execSync('npx vitest run tests/integration.test.ts', { cwd: projectRoot, stdio: 'inherit' });
		console.log('\n✅ Integration tests passed successfully! Your credentials are valid.\n');
		console.log('🎉 Onboarding complete! Run `npm run dev:server` or `npm start` to run the bot.');
	} catch (err) {
		console.error('\n❌ Integration tests failed. Please check your Reddit Auth credentials in .env and try again.');
	}
}

run().catch(console.error);
