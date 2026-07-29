const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git')) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) results = results.concat(walk(full));
        else if (full.endsWith('.js') || full.endsWith('.jsx')) results.push(full);
    });
    return results;
}
const files = walk('./app');
let mocks = {};
files.forEach(f => {
    try {
        const code = fs.readFileSync(f, 'utf8');
        const hasToastInfo = code.match(/toast\.(info|success)\([^)]*?(soon|implemented|saved|sent|updated).*?\)/i);
        const hasClickableDummy = code.match(/onClick=\{\(\) => toast[^(]*\([^)]+\)\}/);
        const hasMockData = code.match(/const [A-Z_]+ = \[\s*\{.*?\}\s*\]/s);
        const hasSynthetic = code.match(/SYNTHETIC/i);
        if (hasToastInfo || hasMockData || hasSynthetic || hasClickableDummy) {
            mocks[f] = {
                mockData: !!hasMockData,
                synthetic: !!hasSynthetic,
                dummyClick: !!hasClickableDummy
            };
        }
    } catch (e) { }
});
console.log(JSON.stringify(mocks, null, 2));
