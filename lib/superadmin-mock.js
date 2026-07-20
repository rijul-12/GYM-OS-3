// Super Admin mock data — realistic SaaS platform data for GymOS company management.
// Ready to swap for Supabase queries later.

import gymsData from '../scripts/mock-db-gyms.json'
import trainersData from '../scripts/mock-db-trainers.json'
import membersData from '../scripts/mock-db-members.json'

// ---------- PLATFORM KPIs ----------
export const PLATFORM_STATS = {
    totalGyms: gymsData.length,
    activeGyms: gymsData.filter(g => g.status === 'Active').length,
    inactiveGyms: gymsData.filter(g => g.status === 'Inactive').length,
    trialGyms: gymsData.filter(g => g.status === 'Suspended').length,
    totalMembers: membersData.length,
    totalTrainers: trainersData.length,
    todayAttendance: membersData.filter(m => m.checkedIn).length,
    monthlyRevenue: gymsData.reduce((acc, g) => acc + g.revenue, 0),
    mrr: gymsData.reduce((acc, g) => acc + g.revenue, 0),
    arr: gymsData.reduce((acc, g) => acc + g.revenue, 0) * 12,
    newSignups: 23,
    renewals: 15,
    expiringSubscriptions: 8,
    cancelledGyms: 3,
}

// ---------- PLATFORM HEALTH ----------
export const PLATFORM_HEALTH = {
    serverStatus: 'Operational',
    apiHealth: '99.97%',
    storageUsage: '2.4 TB / 5 TB',
    storagePercent: 48,
    databaseStatus: 'Healthy',
    cpuUsage: 34,
    memoryUsage: 62,
    uptime: '99.99%',
    lastIncident: '14 days ago',
}

// ---------- GYMS ----------
const CITIES = [
    { city: 'Mumbai', country: 'India' },
    { city: 'Delhi', country: 'India' },
    { city: 'Bangalore', country: 'India' },
    { city: 'Hyderabad', country: 'India' },
    { city: 'Pune', country: 'India' },
    { city: 'Chennai', country: 'India' },
    { city: 'Kolkata', country: 'India' },
    { city: 'Ahmedabad', country: 'India' },
    { city: 'San Francisco', country: 'USA' },
    { city: 'New York', country: 'USA' },
    { city: 'London', country: 'UK' },
    { city: 'Dubai', country: 'UAE' },
]

const GYM_NAMES = [
    'Iron Peak Gym', 'Ascend Fitness', 'Momentum Athletic', 'Titan Gym', 'FitZone',
    'Pulse Fitness', 'Apex Gym', 'CoreForce', 'FlexHub', 'VitalFit',
    'PowerHouse Gym', 'ZenFit Studio', 'Elevate Fitness', 'StrongLife', 'PrimeBody',
    'OmniGym', 'Atlas Fitness', 'Velocity Gym', 'NexGen Fitness', 'UltraFit',
    'PeakForm Gym', 'SweatFactory', 'GrindHouse', 'Forge Fitness', 'BeastMode Gym',
]

const OWNER_NAMES = [
    'James Holloway', 'Rachel Kim', 'Tomas Rivera', 'Amit Patel', 'Priya Nair',
    'David Chen', 'Sofia Martinez', 'Marcus Reid', 'Aisha Khan', 'Oliver Larsen',
    'Rajesh Sharma', 'Emma Wilson', 'Carlos Diaz', 'Neha Gupta', 'Ryan Mitchell',
    'Lisa Park', 'Arjun Mehta', 'Hannah Taylor', 'Kevin O\'Brien', 'Sneha Reddy',
    'Michael Foster', 'Anjali Iyer', 'Chris Brown', 'Pooja Desai', 'Samuel Green',
]

const PLAN_TYPES = ['Basic', 'Pro', 'Enterprise']
const STATUSES = ['Active', 'Active', 'Active', 'Active', 'Trial', 'Suspended', 'Expired']

export const GYMS = Array.from({ length: 25 }, (_, i) => {
    const loc = CITIES[i % CITIES.length]
    const plan = PLAN_TYPES[i % 3]
    const status = i < 18 ? (i < 15 ? 'Active' : 'Trial') : STATUSES[i % STATUSES.length]
    const members = Math.floor(80 + Math.random() * 600)
    const trainers = Math.floor(4 + Math.random() * 30)
    const revenue = plan === 'Enterprise' ? Math.floor(30000 + Math.random() * 50000) : plan === 'Pro' ? Math.floor(12000 + Math.random() * 25000) : Math.floor(4000 + Math.random() * 10000)

    return {
        id: `gym-${i + 1}`,
        name: GYM_NAMES[i % GYM_NAMES.length],
        logo: GYM_NAMES[i % GYM_NAMES.length][0],
        owner: OWNER_NAMES[i % OWNER_NAMES.length],
        ownerEmail: `${OWNER_NAMES[i % OWNER_NAMES.length].split(' ')[0].toLowerCase()}@${GYM_NAMES[i % GYM_NAMES.length].replace(/\s+/g, '').toLowerCase()}.com`,
        ownerPhone: `+91 ${Math.floor(7000000000 + Math.random() * 3000000000)}`,
        city: loc.city,
        country: loc.country,
        members,
        trainers,
        plan,
        status,
        attendanceToday: Math.floor(members * (0.2 + Math.random() * 0.3)),
        revenue,
        connectedDevices: Math.floor(2 + Math.random() * 12),
        biometricStatus: Math.random() > 0.3 ? 'Connected' : 'Disconnected',
        createdDate: `202${Math.floor(3 + Math.random() * 3)}-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
        photo: `https://i.pravatar.cc/100?img=${10 + i}`,
    }
})

// ---------- OWNERS ----------
export const OWNERS = gymsData.map((g) => ({
    id: g.id,
    name: g.owner,
    email: g.email,
    phone: g.phone,
    gyms: 1, // Single franchise model for demo
    totalMembers: g.totalMembers,
    status: g.status,
    joinDate: g.joinDate,
    lastLogin: Math.random() > 0.5 ? 'Today' : '3 days ago',
    photo: g.photo,
    plan: g.plan,
    revenue: g.revenue,
}))

// ---------- SUBSCRIPTIONS ----------
export const SUBSCRIPTION_PLANS = [
    { id: 'basic', name: 'Basic', price: 4999, gyms: 42, color: '#a3a3a3', features: ['Up to 200 members', 'QR attendance', '1 trainer', 'Basic reports'] },
    { id: 'pro', name: 'Pro', price: 14999, gyms: 52, color: '#8b5cf6', features: ['Up to 1000 members', 'Biometric + QR', '10 trainers', 'AI Insights', 'White-label'] },
    { id: 'enterprise', name: 'Enterprise', price: 39999, gyms: 33, color: '#f59e0b', features: ['Unlimited members', 'Full integrations', 'Unlimited trainers', 'Priority support', 'Custom domain', 'API Access'] },
]

export const SUBSCRIPTION_STATS = {
    trial: 18,
    active: 94,
    expired: 9,
    cancelled: 6,
    upcomingRenewals: 15,
    totalMRR: 482000,
    avgRevenuePerGym: 3795,
}

export const REVENUE_MONTHLY = [
    { month: 'Jan', revenue: 312000, gyms: 98 },
    { month: 'Feb', revenue: 328000, gyms: 102 },
    { month: 'Mar', revenue: 356000, gyms: 108 },
    { month: 'Apr', revenue: 389000, gyms: 112 },
    { month: 'May', revenue: 425000, gyms: 118 },
    { month: 'Jun', revenue: 458000, gyms: 123 },
    { month: 'Jul', revenue: 482000, gyms: 127 },
]

// ---------- SUPPORT TICKETS ----------
export const SUPPORT_TICKETS = [
    { id: 'T-1042', gym: 'Iron Peak Gym', subject: 'Biometric scanner not syncing', priority: 'High', status: 'Open', created: '2 hours ago', category: 'Bug Report' },
    { id: 'T-1041', gym: 'Ascend Fitness', subject: 'Request for custom branding API', priority: 'Medium', status: 'In Progress', created: '5 hours ago', category: 'Feature Request' },
    { id: 'T-1040', gym: 'Pulse Fitness', subject: 'Member import CSV failing', priority: 'High', status: 'Open', created: '1 day ago', category: 'Bug Report' },
    { id: 'T-1039', gym: 'CoreForce', subject: 'Add multi-language support', priority: 'Low', status: 'Open', created: '1 day ago', category: 'Feature Request' },
    { id: 'T-1038', gym: 'Titan Gym', subject: 'Dashboard loading slowly', priority: 'Medium', status: 'Resolved', created: '2 days ago', category: 'Bug Report' },
    { id: 'T-1037', gym: 'FlexHub', subject: 'Integrate with Google Calendar', priority: 'Medium', status: 'In Progress', created: '2 days ago', category: 'Feature Request' },
    { id: 'T-1036', gym: 'VitalFit', subject: 'Cannot reset trainer password', priority: 'High', status: 'Resolved', created: '3 days ago', category: 'Bug Report' },
    { id: 'T-1035', gym: 'Apex Gym', subject: 'Request for annual billing option', priority: 'Low', status: 'Open', created: '3 days ago', category: 'Feature Request' },
    { id: 'T-1034', gym: 'ZenFit Studio', subject: 'Mobile app notification bug', priority: 'High', status: 'Resolved', created: '4 days ago', category: 'Bug Report' },
    { id: 'T-1033', gym: 'OmniGym', subject: 'Attendance reports inaccurate', priority: 'Medium', status: 'Open', created: '5 days ago', category: 'Bug Report' },
]

// ---------- AUDIT LOGS ----------
export const AUDIT_LOGS = [
    { id: 'a1', who: 'Super Admin', role: 'super_admin', action: 'Suspended gym', target: 'FitZone', when: '10 min ago', ip: '103.42.18.221' },
    { id: 'a2', who: 'Super Admin', role: 'super_admin', action: 'Created gym', target: 'NexGen Fitness', when: '1 hour ago', ip: '103.42.18.221' },
    { id: 'a3', who: 'Super Admin', role: 'super_admin', action: 'Reset password', target: 'Amit Patel', when: '2 hours ago', ip: '103.42.18.221' },
    { id: 'a4', who: 'System', role: 'system', action: 'Auto-renewed subscription', target: 'Iron Peak Gym', when: '3 hours ago', ip: 'system' },
    { id: 'a5', who: 'Super Admin', role: 'super_admin', action: 'Updated platform settings', target: 'Maintenance Mode OFF', when: '5 hours ago', ip: '103.42.18.221' },
    { id: 'a6', who: 'System', role: 'system', action: 'Attendance sync completed', target: '94 gyms synced', when: '6 hours ago', ip: 'system' },
    { id: 'a7', who: 'Super Admin', role: 'super_admin', action: 'Impersonated owner', target: 'James Holloway (Iron Peak Gym)', when: '1 day ago', ip: '103.42.18.221' },
    { id: 'a8', who: 'System', role: 'system', action: 'Backup completed', target: 'Full database backup', when: '1 day ago', ip: 'system' },
    { id: 'a9', who: 'Super Admin', role: 'super_admin', action: 'Activated gym', target: 'Velocity Gym', when: '2 days ago', ip: '103.42.18.221' },
    { id: 'a10', who: 'System', role: 'system', action: 'SSL certificate renewed', target: '*.gymos.io', when: '3 days ago', ip: 'system' },
    { id: 'a11', who: 'Super Admin', role: 'super_admin', action: 'Deleted gym', target: 'Test Gym 1', when: '4 days ago', ip: '103.42.18.221' },
    { id: 'a12', who: 'System', role: 'system', action: 'Email service restart', target: 'Transactional email queue', when: '5 days ago', ip: 'system' },
]

// ---------- SYSTEM SERVICES ----------
export const SERVICES = [
    { name: 'API Gateway', status: 'Operational', uptime: '99.99%', latency: '42ms', icon: '🌐' },
    { name: 'Database (Primary)', status: 'Operational', uptime: '99.98%', latency: '8ms', icon: '🗄️' },
    { name: 'Database (Replica)', status: 'Operational', uptime: '99.97%', latency: '12ms', icon: '🗄️' },
    { name: 'Auth Service', status: 'Operational', uptime: '99.99%', latency: '18ms', icon: '🔐' },
    { name: 'Storage (S3)', status: 'Operational', uptime: '100%', latency: '65ms', icon: '📦' },
    { name: 'Email Service', status: 'Degraded', uptime: '99.82%', latency: '320ms', icon: '📧' },
    { name: 'Notification Service', status: 'Operational', uptime: '99.95%', latency: '55ms', icon: '🔔' },
    { name: 'Attendance Sync', status: 'Operational', uptime: '99.91%', latency: '180ms', icon: '📡' },
    { name: 'Background Jobs', status: 'Operational', uptime: '99.96%', latency: '—', icon: '⚙️' },
    { name: 'CDN', status: 'Operational', uptime: '100%', latency: '22ms', icon: '🚀' },
]

// ---------- NOTIFICATIONS ----------
export const NOTIFICATIONS = [
    { id: 'n1', type: 'gym', title: 'New gym registered', desc: 'NexGen Fitness (Pune) signed up for Pro plan', time: '10 min ago', read: false, icon: '🏢' },
    { id: 'n2', type: 'alert', title: 'Email service degraded', desc: 'Transactional email latency increased to 320ms', time: '25 min ago', read: false, icon: '⚠️' },
    { id: 'n3', type: 'subscription', title: '3 subscriptions expiring', desc: 'Titan Gym, FlexHub, and VitalFit expire in 5 days', time: '1 hour ago', read: false, icon: '💳' },
    { id: 'n4', type: 'attendance', title: 'Attendance API failure', desc: 'Biometric sync failed for CoreForce (3 retries exhausted)', time: '2 hours ago', read: true, icon: '📡' },
    { id: 'n5', type: 'support', title: 'High priority ticket', desc: 'T-1042: Biometric scanner not syncing (Iron Peak Gym)', time: '2 hours ago', read: true, icon: '🎫' },
    { id: 'n6', type: 'gym', title: 'Gym suspended', desc: 'FitZone suspended due to payment failure', time: '4 hours ago', read: true, icon: '🚫' },
    { id: 'n7', type: 'subscription', title: '15 renewals this week', desc: 'Upcoming renewals worth ₹2,84,000', time: '6 hours ago', read: true, icon: '🔄' },
    { id: 'n8', type: 'alert', title: 'Server alert resolved', desc: 'CPU spike on worker-3 resolved (auto-scaled)', time: '1 day ago', read: true, icon: '✅' },
]

// ---------- ANALYTICS ----------
export const GYM_GROWTH = [
    { month: 'Jan', newGyms: 8, totalGyms: 98, churn: 2 },
    { month: 'Feb', newGyms: 6, totalGyms: 102, churn: 2 },
    { month: 'Mar', newGyms: 9, totalGyms: 108, churn: 3 },
    { month: 'Apr', newGyms: 7, totalGyms: 112, churn: 3 },
    { month: 'May', newGyms: 10, totalGyms: 118, churn: 4 },
    { month: 'Jun', newGyms: 8, totalGyms: 123, churn: 3 },
    { month: 'Jul', newGyms: 7, totalGyms: 127, churn: 3 },
]

export const ATTENDANCE_TREND = [
    { month: 'Jan', attendance: 82400 },
    { month: 'Feb', attendance: 89200 },
    { month: 'Mar', attendance: 96800 },
    { month: 'Apr', attendance: 104500 },
    { month: 'May', attendance: 112800 },
    { month: 'Jun', attendance: 118400 },
    { month: 'Jul', attendance: 126720 },
]

export const TOP_CITIES = [
    { city: 'Mumbai', gyms: 22, members: 4120, revenue: 98000 },
    { city: 'Delhi', gyms: 18, members: 3420, revenue: 82000 },
    { city: 'Bangalore', gyms: 16, members: 2980, revenue: 71000 },
    { city: 'Pune', gyms: 14, members: 2540, revenue: 54000 },
    { city: 'Hyderabad', gyms: 12, members: 2180, revenue: 48000 },
    { city: 'Chennai', gyms: 10, members: 1820, revenue: 42000 },
]

export const TOP_GYMS = [
    { name: 'Iron Peak Gym', city: 'Mumbai', members: 842, revenue: 48000, growth: '+12%' },
    { name: 'Ascend Fitness', city: 'Delhi', members: 724, revenue: 42000, growth: '+18%' },
    { name: 'Momentum Athletic', city: 'Bangalore', members: 612, revenue: 38000, growth: '+8%' },
    { name: 'Titan Gym', city: 'Pune', members: 568, revenue: 35000, growth: '+15%' },
    { name: 'Pulse Fitness', city: 'Hyderabad', members: 498, revenue: 32000, growth: '+22%' },
]

// ---------- FEATURE FLAGS ----------
export const FEATURE_FLAGS = [
    { id: 'ff1', name: 'AI Insights', key: 'ai_insights', enabled: true, desc: 'Enable AI-powered predictions and recommendations' },
    { id: 'ff2', name: 'Biometric Attendance', key: 'biometric_attendance', enabled: true, desc: 'Allow gyms to use biometric scanners' },
    { id: 'ff3', name: 'White-Label Branding', key: 'white_label', enabled: true, desc: 'Custom branding, colors, and domain' },
    { id: 'ff4', name: 'Mobile Push Notifications', key: 'push_notifications', enabled: true, desc: 'Push notifications for members and trainers' },
    { id: 'ff5', name: 'API Access (Enterprise)', key: 'api_access', enabled: true, desc: 'REST API access for enterprise gyms' },
    { id: 'ff6', name: 'Beta: Video Coaching', key: 'video_coaching', enabled: false, desc: 'Live video coaching sessions between trainers and members' },
    { id: 'ff7', name: 'Beta: Nutrition Tracker', key: 'nutrition_tracker', enabled: false, desc: 'Meal logging and macro tracking for members' },
    { id: 'ff8', name: 'Maintenance Mode', key: 'maintenance_mode', enabled: false, desc: 'Put the platform in maintenance mode' },
]

// ---------- PLATFORM SETTINGS ----------
export const PLATFORM_SETTINGS = {
    platformName: 'GymOS',
    supportEmail: 'support@gymos.io',
    defaultTheme: 'dark',
    defaultPrimaryColor: '#ef4444',
    maintenanceMode: false,
    globalNotifications: true,
    trialDays: 14,
    maxGymsPerOwner: 10,
}
