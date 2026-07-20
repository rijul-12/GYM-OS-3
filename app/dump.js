const http = require('http');
const fs = require('fs');
http.get('http://localhost:3001/login?next=%2Fportal%2Fprofile', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('dump.html', data);
        console.log('HTML Payload length:', data.length);
        console.log('Top 20 lines:', data.split('\\n').slice(0, 20).join('\\n'));
        if (data.includes('member.attendance.forEach is not a function')) {
            console.log('FOUND ATTENDANCE BUG');
        }
    });
}).on('error', console.error);
