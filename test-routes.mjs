const routes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/dashboard',
    '/trainer',
    '/portal',
    '/super-admin',
    '/analytics',
    '/attendance',
    '/settings',
    '/branding',
    '/notifications',
    '/portal/membership',
    '/portal/profile',
    '/super-admin/support',
    '/some-random-404-page'
];

async function testRoutes() {
    console.log('--- STARTING ROUTE QA ON PORT 3001 ---');
    let failures = 0;
    for (const route of routes) {
        try {
            const res = await fetch(`http://localhost:3001${route}`);
            if (res.ok || res.status === 200 || (route === '/some-random-404-page' && res.status === 404)) {
                console.log(`✅ ${route} loaded successfully (Status: ${res.status})`);
            } else {
                console.error(`❌ ${route} failed with Status: ${res.status}`);
                failures++;
            }
        } catch (e) {
            console.error(`❌ ${route} crashed violently:`, e.message);
            failures++;
        }
    }

    if (failures === 0) {
        console.log('✅ PHASE 3 ROUTING PASSED. No Runtime crashes or unhandled server anomalies.');
    } else {
        console.error(`⚠️ PHASE 3 FAILED with ${failures} errors.`);
    }
}

testRoutes();
