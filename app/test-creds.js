const fs = require('fs');
const contents = fs.readFileSync('../.env.prod.local', 'utf8');

const getVal = (key) => {
    const regex = new RegExp(`^${key}=("?)(.*)\\1$`, 'm');
    const match = contents.match(regex);
    return match ? match[2].trim() : undefined;
};

console.log("PROJECT:", getVal('FIREBASE_PROJECT_ID') ? 'FOUND' : 'MISSING');
console.log("PRIVATE_KEY:", getVal('FIREBASE_PRIVATE_KEY') ? 'FOUND' : 'MISSING');
console.log("EMAIL:", getVal('FIREBASE_CLIENT_EMAIL') ? 'FOUND' : 'MISSING');
