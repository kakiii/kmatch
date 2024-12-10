const sharp = require('sharp');

// Create a simple colored square as icon
async function createIcons() {
  const sizes = [16, 48, 128];
  
  for (const size of sizes) {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 66, g: 133, b: 244, alpha: 1 } // Google blue color
      }
    })
    .png()
    .toFile(`icon${size}.png`);
  }
}

createIcons().catch(console.error); 