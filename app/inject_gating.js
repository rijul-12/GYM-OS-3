const fs = require('fs');

const GATES = {
    'portal/attendance/attendance-client.js': { shell: '<PortalShell', title: 'Attendance Analytics', desc: 'Historical timeline generation is isolated to V2.', return: '/portal' },
    'portal/insights/insights-client.js': { shell: '<PortalShell', title: 'AI Insights', desc: 'Machine-learning powered engagement heatmaps are scheduled for V2 rollout.', return: '/portal' },
    'portal/live/live-client.js': { shell: '<PortalShell', title: 'Live Floor Telemetry', desc: 'Real-time hardware connectivity requires physical IoT bridges.', return: '/portal' },
    'portal/profile/profile-client.js': { shell: '<PortalShell', title: 'Profile Editing', desc: 'Client-side profile mutation is paused during tenant migrations.', return: '/portal' },
    'trainer/live/live-client.js': { shell: '<TrainerShell', title: 'Live Telemetry', desc: 'Connected machine hardware tracking requires V2 IoT bridges.', return: '/trainer' },
    'trainer/members/members-client.js': { shell: '<TrainerShell', title: 'Trainer Client Roster', desc: 'Advanced roster management and progress mapping is migrating to a dedicated service.', return: '/trainer' },
    'trainer/plans/plans-client.js': { shell: '<TrainerShell', title: 'AI Plan Generation', desc: 'Intelligent multi-week matrix generation is in closed Beta.', return: '/trainer' },
    'trainer/profile/profile-client.js': { shell: '<TrainerShell', title: 'Trainer Settings', desc: 'Trainer profile overrides are currently restricted to SuperAdmin accounts.', return: '/trainer' }
};

for (const [file, gate] of Object.entries(GATES)) {
    const p = `d:/Users/rijul/Downloads/Gym-OS-main/Gym-OS-main/app/${file}`;
    if (!fs.existsSync(p)) continue;

    let code = fs.readFileSync(p, 'utf8');

    // Skip if already injected
    if (code.includes('ComingSoonModal')) continue;

    // Inject Import
    code = code.replace("import { useBrand } from '@/components/brand-provider'", "import { useBrand } from '@/components/brand-provider'\nimport { ComingSoonModal } from '@/components/coming-soon-modal'");

    // Inject Component under Shell Wrapper
    const regex = new RegExp(`(${gate.shell}[^>]*>)`);
    const injection = `\n            <ComingSoonModal open={true} onOpenChange={()=>{}} title="${gate.title}" feature="V2 Feature" description="${gate.desc}" fallbackRoute="${gate.return}" />`;
    code = code.replace(regex, `$1${injection}`);

    fs.writeFileSync(p, code);
    console.log(`[INJECTED] Option B Gating applied to ${file}`);
}
