import fs from 'fs'
import path from 'path'

const DIRS = ['../app', '../components', '../actions', '../hooks', '../lib']

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
            results.push(fullPath);
        }
    });
    return results;
}

let modifiedCount = 0;

for (const dir of DIRS) {
    const files = walk(dir);
    for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');

        // Target explicit "GymOS" strings safely:
        // Do not replace inside URLs if possible, though 'GymOS' is capitalized so it's likely safe.
        // We will replace "GymOS" (case-sensitive) with "BGM"
        // Also "Best Gym Manager" where appropriate, but "BGM" is safer for UI.

        // Wait, what about 'Gym-OS' or 'Gym OS'? The user asked to search for them too.
        let newContent = content
            .replace(/GymOS/g, 'BGM')
            .replace(/Gym Os/g, 'BGM')
            .replace(/Gym OS/g, 'BGM')

        if (newContent !== content) {
            fs.writeFileSync(f, newContent, 'utf8')
            modifiedCount++;
            console.log("Updated: " + f)
        }
    }
}

console.log("Total files modified: " + modifiedCount);
