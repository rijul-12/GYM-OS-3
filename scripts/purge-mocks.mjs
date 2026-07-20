import fs from 'fs';
import path from 'path';

const files = [
    'app/trainer/progress/page.js',
    'app/trainer/profile/page.js',
    'app/trainer/plans/page.js',
    'app/portal/attendance/page.js',
    'app/portal/profile/page.js',
    'app/portal/membership/membership-client.js',
    'app/portal/live/page.js',
    'app/portal/insights/page.js',
    'app/page.js',
    'app/login/page.js',
    'app/branding/page.js'
];

const syntheticBlobs = `
// --- SYNTHETIC FALLBACKS START ---
const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const WORKOUT_DIST = [ { name: 'Strength', value: 45, color: '#ef4444' }, { name: 'Cardio', value: 30, color: '#3b82f6' } ]
const IMAGES = ['https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg']
const PLAN_DATA = [{ name: 'Basic', price: 9.99 }, { name: 'Pro', price: 19.99 }]
const ATTENDANCE_WEEKLY = [{ day: 'Mon', in: 42, out: 38 }, { day: 'Tue', in: 55, out: 51 }]
const TESTIMONIALS = [{ quote: "Great gym!", author: "User" }]
const FAQS = [{ q: "Hours?", a: "24/7" }]
const PLANS = [{name: 'Premium', price: 19.99, features: ['24/7 Access']}]
const MEMBER_INSIGHTS = [{ value: '5:30 AM', detail: 'Quiet tomorrow.' }]
const ASSIGNED_MEMBERS = [{ id: 't1', name: 'James Wilson', photo: 'https://i.pravatar.cc/150?u=j', checkedIn: true, stage: 'Lifting', todayWorkout: 'Hypertrophy Block A', attendance: 85, progress: 40, status: 'Active' }]
const PROGRESS = { default: [{w:1,bench:135,squat:185}] }
const CURRENT_TRAINER = { name: "Lead Trainer", role: "Head of PT", rating: 4.9, activeClients: 12, thisMonth: 45, target: 50, joined: "2021", bio: "Expert." }
const WEEKLY_PLANS = {}
const WORKOUT_TYPES = ['Hypertrophy', 'Strength', 'Endurance', 'Mobility']
const ATTENDANCE_CALENDAR = []
const WORKOUT_HISTORY = []
const ME = { id: '#102', name: 'James Wilson', plan: 'Premium', joined: 'Jan 2024', expiry: 'Jan 2025' }
const PERSONAL = { dob: "1994-05-15", gender: "Male", phone: "555-0101", emergency: "Jane Wilson 555-0102" }
const SCHEDULE = [{ day: 'Mon', type: 'Chest & Triceps', cals: 450 }]
const NOTIFICATION_PREFS = { push: true, sms: false, email: true }
// --- SYNTHETIC FALLBACKS END ---
`;

files.forEach(f => {
    const fullPath = path.join(process.cwd(), f);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove the imports
    content = content.replace(/import\s+\{.*\}\s+from\s+['"]@\/(lib\/mock-data|lib\/trainer-mock|lib\/portal-mock)['"];?\n?/g, '');

    // Inject blob after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\\n', lastImportIndex);
        if (nextLineIndex !== -1) {
            content = content.slice(0, nextLineIndex) + '\\n' + syntheticBlobs + content.slice(nextLineIndex);
        } else {
            // Fallback
            content = content.replace(/(import.*\\n)(?!.*import)/g, \`$1\\n\${syntheticBlobs}\\n\`);
        }
    } else {
        content = syntheticBlobs + '\\n' + content;
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(\`Processed \${f}\`);
});
