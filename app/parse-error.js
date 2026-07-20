const fs = require('fs');
const html = fs.readFileSync('debug-response.html', 'utf-8');
const parts = html.split('Error:');
console.log(`Found ${parts.length - 1} exact matches for "Error:".`);
if (parts.length > 1) {
    for (let i = 1; i < Math.min(parts.length, 5); i++) {
        console.log(`\n\n--- MATCH ${i} ---`);
        console.log(html.substring(html.indexOf('Error:', parts[i - 1].length) - 100, html.indexOf('Error:', parts[i - 1].length) + 500));
    }
}
const notFound = html.indexOf('not-found');
if (notFound > -1) {
    console.log('\n\n--- NOT FOUND MATCH ---');
    console.log(html.substring(notFound - 50, notFound + 100));
}
