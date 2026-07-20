const fs = require('fs');
const path = require('path');

const ROUTES = ['attendance', 'insights', 'profile', 'schedule'];
const BASE = process.cwd();

ROUTES.forEach(route => {
    const dir = path.join(BASE, 'portal', route);
    const clientPath = path.join(dir, `${route}-client.js`);
    const serverPath = path.join(dir, 'page.js');

    // Default server component template
    const template = `import { Suspense } from 'react'
import ClientView from './${route}-client'
import { getMyProfile } from '@/actions/db/members'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { getDashboardStats } from '@/actions/db/gyms'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function ${route.charAt(0).toUpperCase() + route.slice(1)}Page() {
  try {
    const [profile, attendance, stats] = await Promise.all([
      getMyProfile(),
      getAttendanceLogs(150),
      getDashboardStats()
    ])
    return (
      <Suspense fallback={<div className="p-8"><CardSkeleton /></div>}>
        <ClientView member={profile} globalAttendance={attendance} stats={stats} />
      </Suspense>
    )
  } catch (error) {
    return <div className="p-8"><DataErrorState error={error} /></div>
  }
}
`;

    // 1. Rename page.js to client path if it's currently a client file
    let content = '';
    if (fs.existsSync(serverPath)) {
        content = fs.readFileSync(serverPath, 'utf8');
        if (content.includes("'use client'") || content.includes('"use client"')) {
            // It's the old monolithic file. Move it to client

            // Regex replace mock definitions with prop destructuring
            content = content.replace(/function App\(\) {/g, `function App({ member, globalAttendance, stats }) {
  // --- INJECTED PROPS ---
  const ME = { 
    name: member?.name || "Member", 
    plan: member?.plan || "Basic", 
    joined: new Date(member?.created_at).toLocaleDateString() || 'Recently',
    email: member?.email || 'N/A',
    phone: member?.phone || 'N/A',
    emergency: member?.emergencyContact || 'Not provided',
    photo: member?.photo_url || \`https://i.pravatar.cc/150?u=\${member?.email}\`
  };
  const PERSONAL = { 
    dob: member?.dob || "N/A", 
    height: (member?.bodyMeasurements?.height) + " cm" || "N/A",
    weight: (member?.bodyMeasurements?.weight) + " kg" || "N/A",
    bloodType: "N/A",
    goals: member?.goal || "General",
    trainer: member?.trainers?.name || "Unassigned"
  };
  const WORKOUT_HISTORY = member?.workout_logs ? member.workout_logs.map(w => ({ date: w.date_logged || new Date(), workout: w.workout_plan_name || 'Workout', duration: w.duration_minutes || parseInt(w.duration)|| 45, calories: w.calories_burned || parseInt(w.calories) || 300, stage: 'Lifting' })) : [];
  const ATTENDANCE_CALENDAR = { year: new Date().getFullYear(), month: new Date().getMonth(), today: new Date().getDate(), days: {} };
  if (member?.attendance) {
     member.attendance.forEach(a => {
         const d = new Date(a.checkIn || a.check_in_time).getDate();
         ATTENDANCE_CALENDAR.days[d] = { visited: true, duration: 60, intensity: 1 };
     });
  }
  const MEMBER_INSIGHTS = stats?.insights || [];
  const SCHEDULE = [{ day: 'Today', workout: member?.workoutSplit || 'General Fitness', time: member?.preferredTime || 'Anytime' }];
  const NOTIFICATION_PREFS = [ {id: 'em', label: 'Email', on: true}, {id: 'pu', label: 'Push', on: true} ];
  `);

            fs.writeFileSync(clientPath, content);
            fs.writeFileSync(serverPath, template);
            console.log(`Converted ${route}`);
        } else {
            // It is already a server file. (like schedule)
            // Just update its fetch logic to use getMyProfile
            if (content.includes('getMemberProfile(session.uid')) {
                content = content.replace(/getMemberProfile\(session.uid \|\| 'demo'\)/, 'getMyProfile()');
                fs.writeFileSync(serverPath, content);
                console.log(`Patched Server ${route}`);
            }
        }
    }
});

console.log("Done");
