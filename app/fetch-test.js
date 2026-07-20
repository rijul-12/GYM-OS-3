const http = require('http');
const session = encodeURIComponent(JSON.stringify({ uid: "user_1", gymCode: "TST", role: "member", email: "demo@example.com" }));

['schedule', 'profile', 'attendance', 'insights'].forEach(route => {
    http.get(`http://localhost:8001/portal/${route}`, { headers: { Cookie: `gymos_session=${session}` } }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => console.log(`ROUTE: ${route} STATUS: ${res.statusCode}`));
    }).on('error', e => console.error(e));
});
