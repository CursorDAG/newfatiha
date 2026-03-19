const fs = require('fs');
const path = require('path');

// Simple PNG generation using Canvas API (if available) or create placeholder
// For production, use proper image generation tools

const sizes = [192, 512];

// Create a simple colored square as placeholder
// This is a minimal 1x1 emerald green PNG that can be scaled
function createPlaceholderPNG(size) {
  // Minimal PNG with emerald color (#059669)
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64PNG, 'base64');
}

sizes.forEach(size => {
  const filename = path.join(__dirname, '..', 'public', `icon-${size}.png`);
  const data = createPlaceholderPNG(size);
  fs.writeFileSync(filename, data);
  console.log(`Created ${filename}`);
});

console.log('\nIcon generation complete. Note: These are placeholders.');
console.log('For production, convert icon.svg to PNG using:');
console.log('  npm install sharp');
console.log('  npx sharp -i public/icon.svg -o public/icon-192.png resize 192 192');
console.log('  npx sharp -i public/icon.svg -o public/icon-512.png resize 512 512');
