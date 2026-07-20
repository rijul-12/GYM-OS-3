const fs = require('fs');
['attendance', 'insights', 'profile'].forEach(d => {
    let p = `portal/${d}/${d}-client.js`;
    let c = fs.readFileSync(p, 'utf8');
    let start = c.indexOf('// --- SYNTHETIC FALLBACKS START ---');
    let end = c.indexOf('// --- SYNTHETIC FALLBACKS END ---');
    if (start > -1 && end > -1) {
        fs.writeFileSync(p, c.substring(0, start) + c.substring(end + 34));
    }
});
