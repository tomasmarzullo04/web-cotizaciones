const fs = require('fs');
const path = require('path');

const nestlePath = path.join(__dirname, '../public/nestle.png');
const outputPath = path.join(__dirname, '../lib/logos.ts');

try {
    const b64 = fs.readFileSync(nestlePath, 'base64');
    const content = `export const LOGO_NESTLE = 'data:image/png;base64,${b64}';

export const LOGO_SI = ''; // Placeholder for StoreIntelligence
`;
    fs.writeFileSync(outputPath, content);
    console.log('Successfully generated lib/logos.ts');
} catch (error) {
    console.error('Error generating logos:', error);
    process.exit(1);
}
