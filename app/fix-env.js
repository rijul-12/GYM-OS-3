const fs = require('fs');

const prod = fs.readFileSync('../.env.prod.local', 'utf8');
let local = fs.readFileSync('../.env.local.bak', 'utf8');

const combined = local + '\\n' + prod;
fs.writeFileSync('../.env.local', combined, 'utf8');
console.log("Merged safely with UTF-8.");
