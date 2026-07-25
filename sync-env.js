const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found at ' + envPath);
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;

    let key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();

    if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
    }

    if (key === 'FIREBASE_PRIVATE_KEY') {
        val = val.replace(/\\n/g, '\n');
    }

    fs.writeFileSync('tmp_val.txt', val);
    console.log('Uploading: ' + key);

    try {
        execSync('npx vercel env add ' + key + ' production < tmp_val.txt', { stdio: 'inherit', shell: true });
    } catch (err) {
        console.error('Failed to sync ' + key);
    }
}

if (fs.existsSync('tmp_val.txt')) fs.unlinkSync('tmp_val.txt');
console.log('Environment Sync Complete!');
