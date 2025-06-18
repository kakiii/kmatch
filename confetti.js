const emojis = [
	'⭐',
	'🔍',
	'💼',
	'🎉',
	'✨',
	'🚀',
	'💫',
	'🌟',
	'⚡',
	'🎯',
	'🎨',
	'🌈',
	'💌',
	'📌',
	'㊗️',
	'🚩',
	'😻',
	'🤑',
	'🤞🏼',
	'🤙🏼',
	'🙌🏼',
	'💪🏼',
	'👍🏼'
];

function createFirework(x, y) {
	const particleCount = 8;
	const spread = 360 / particleCount;

	// Shuffle and get unique emojis for this firework
	const shuffledEmojis = [...emojis].sort(() => Math.random() - 0.5).slice(0, particleCount);

	for (let i = 0; i < particleCount; i++) {
		const emoji = document.createElement('div');
		emoji.className = 'emoji';
		emoji.textContent = shuffledEmojis[i]; // Use unique emoji for each particle

		emoji.style.left = x + 'px';
		emoji.style.top = y + 'px';

		const angle = spread * i;
		const velocity = 2 + Math.random();
		emoji.style.setProperty('--angle', angle + 'deg');
		emoji.style.setProperty('--velocity', velocity);

		emoji.style.fontSize = 25 + Math.random() * 8 + 'px';

		document.body.appendChild(emoji);

		setTimeout(() => emoji.remove(), 2000);
	}
}

function createThreeFireworks() {
	// Create three fireworks at different positions
	for (let i = 0; i < 3; i++) {
		const x = Math.random() * window.innerWidth;
		const y = Math.random() * (window.innerHeight * 0.6) + window.innerHeight * 0.2;
		createFirework(x, y);
	}
}

function startFireworks() {
	// Create initial three fireworks immediately
	createThreeFireworks();

	// Continue with interval
	setInterval(createThreeFireworks, 1000);
}

startFireworks();
