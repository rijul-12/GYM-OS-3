const fs = require('fs');
const path = require('path');

// Seed dictionaries for hyper-realistic procedural generation
const firstNames = ['James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'Lucas', 'Isabella', 'Alexander', 'Mia', 'Mateo', 'Charlotte', 'Ethan', 'Amelia', 'David', 'Harper', 'Daniel', 'Evelyn', 'Ryan', 'Abigail', 'Marcus', 'Sofia', 'Jamal', 'Priya', 'David', 'Mei', 'Isabella', 'Marco', 'Tyler', 'Sarah', 'Joshua', 'Emily'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];
const gymPrefixes = ['Iron', 'Velocity', 'Apex', 'Titan', 'Core', 'Elevate', 'Forge', 'Peak', 'Pulse', 'Onyx', 'Quantum', 'Zenith', 'Ascend', 'Flex'];
const gymSuffixes = ['Fitness', 'Gym', 'Athletics', 'Strength', 'Barbell', 'Performance', 'Health Club', 'Studio', 'Training', 'Hub'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'San Francisco', 'Charlotte', 'Indianapolis', 'Seattle', 'Denver', 'Washington'];

function r(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 1. Generate 127 Gyms & Owners
const gyms = [];
for (let i = 0; i < 127; i++) {
    const ownerName = `${r(firstNames)} ${r(lastNames)}`;
    const gymName = `${r(gymPrefixes)} ${r(gymSuffixes)}`;
    const joinDate = new Date(Date.now() - ri(10, 800) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const revenue = ri(5000, 42000);
    const membersCount = ri(60, 480);

    gyms.push({
        id: `gym-${i + 1}`,
        name: gymName,
        owner: ownerName,
        email: `${ownerName.split(' ')[0].toLowerCase()}@${gymName.split(' ')[0].toLowerCase()}.com`,
        phone: `+1 ${ri(200, 999)} ${ri(200, 999)} ${ri(1000, 9999)}`,
        city: r(cities),
        status: Math.random() > 0.1 ? 'Active' : (Math.random() > 0.5 ? 'Suspended' : 'Inactive'),
        plan: r(['Basic', 'Pro', 'Enterprise']),
        joinDate,
        revenue,
        totalMembers: membersCount,
        photo: `https://i.pravatar.cc/150?img=${ri(1, 70)}`
    });
}
fs.writeFileSync(path.join(__dirname, 'mock-db-gyms.json'), JSON.stringify(gyms, null, 2));

// 2. Generate 462 Trainers
const trainers = [];
for (let i = 0; i < 462; i++) {
    const name = `${r(firstNames)} ${r(lastNames)}`;
    trainers.push({
        id: `trainer-${i + 1}`,
        name,
        specialty: r(['CrossFit', 'Powerlifting', 'Yoga', 'HIIT', 'Bodybuilding', 'Rehabilitation']),
        rating: (ri(40, 50) / 10).toFixed(1),
        activeClients: ri(5, 30),
        gymId: `gym-${ri(1, 127)}`,
        photo: `https://i.pravatar.cc/150?img=${ri(1, 70)}`
    });
}
fs.writeFileSync(path.join(__dirname, 'mock-db-trainers.json'), JSON.stringify(trainers, null, 2));

// 3. Generate 18,240 Members
const members = [];
for (let i = 0; i < 18240; i++) {
    const name = `${r(firstNames)} ${r(lastNames)}`;
    const joinDate = new Date(Date.now() - ri(10, 800) * 24 * 60 * 60 * 1000);
    const expiry = new Date(joinDate.getTime() + ri(30, 365) * 24 * 60 * 60 * 1000);

    // Simulate live checkins for today's dashboard mapping
    const isCheckedIn = Math.random() > 0.95; // ~5% of 18k = ~900 people currently working out across the gyms globally
    let checkinTime = null, stage = 'Offline', progress = 0;

    if (isCheckedIn) {
        checkinTime = `${ri(1, 12)}:${String(ri(0, 59)).padStart(2, '0')} ${r(['AM', 'PM'])}`;
        stage = r(['Just Started', 'Early Workout', 'Mid Workout', 'Last Mile', 'Workout Complete']);
        progress = ri(0, 100);
    }

    members.push({
        id: `m-${i + 1}`,
        name,
        gymId: `gym-${ri(1, 127)}`,
        plan: r(['Premium', 'Gold', 'Silver', 'Basic']),
        status: expiry.getTime() < Date.now() ? 'Expired' : 'Active',
        phone: `+1 ${ri(200, 999)} ${ri(200, 999)} ${ri(1000, 9999)}`,
        email: `${name.replace(' ', '.').toLowerCase()}@mockmail.com`,
        workout: r(['Push / Pull / Legs', 'Full Body', 'Cardio + ABS', 'Yoga', 'Powerlifting', 'HIIT Circuit']),
        joined: joinDate.toISOString().split('T')[0],
        expiry: expiry.toISOString().split('T')[0],
        attendance: ri(20, 100),
        checkedIn: isCheckedIn,
        checkinTime,
        stage,
        progress,
        photo: `https://avatars.githubusercontent.com/u/${ri(10000, 99999)}?v=4`
    });
}
// Massive file, stringify concisely
fs.writeFileSync(path.join(__dirname, 'mock-db-members.json'), JSON.stringify(members));

console.log('Successfully synthesized 127 Gyms, 462 Trainers, and 18,240 Members.');
