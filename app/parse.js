const fs = require('fs');
const html = fs.readFileSync('error.html', 'utf8');
const match = html.match(/"message":"([^"]+)"/g);
console.log(match ? match.slice(0, 15) : 'nothing');
