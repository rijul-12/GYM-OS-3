import { test } from 'node:test'
import assert from 'node:assert/strict'

import { dateKey, hourInTz, weekdayInTz, parseFlexibleDate, addDaysToKey } from '../../lib/domain/dates.js'
import { normalizePhone, isValidEmail } from '../../lib/domain/phone.js'
import { getEffectiveStatus, computeDues, daysUntilExpiry, normalizeStoredStatus, addDuration, cycleToMonths, MEMBER_STATUS } from '../../lib/domain/membership.js'
import { normalizeSchedule, getMemberSchedule, getPlannedWorkout, normalizeDayEntry } from '../../lib/domain/schedule.js'
import { countOccupancy, computeDemand, getLiveSessions, isOpenSession, isStaleSession, sessionDurationMinutes, demandLevel } from '../../lib/domain/occupancy.js'
import { detectColumnMapping, applyMapping, validateImportRows, buildErrorReportCsv } from '../../lib/domain/import.js'

// ---------------------------------------------------------------- dates
test('dates use the gym timezone, not the server clock', () => {
    const lateUtc = new Date('2026-03-10T20:30:00Z') // 02:00 on 11 March in IST
    assert.equal(dateKey(lateUtc, 'Asia/Kolkata'), '2026-03-11')
    assert.equal(dateKey(lateUtc, 'UTC'), '2026-03-10')
    assert.equal(hourInTz(lateUtc, 'Asia/Kolkata'), 2)
    assert.equal(weekdayInTz(lateUtc, 'Asia/Kolkata'), 'Wednesday')
    assert.equal(hourInTz(new Date('2026-03-10T18:30:00Z'), 'Asia/Kolkata'), 0)
    assert.equal(addDaysToKey('2026-03-01', -1), '2026-02-28')
})

test('flexible date parsing (day-first, ISO, text months, Excel serials)', () => {
    assert.equal(parseFlexibleDate('2026-01-31'), '2026-01-31')
    assert.equal(parseFlexibleDate('31/01/2026'), '2026-01-31')
    assert.equal(parseFlexibleDate('5-3-26'), '2026-03-05')
    assert.equal(parseFlexibleDate('12 Jan 2025'), '2025-01-12')
    assert.equal(parseFlexibleDate('Jan 12, 2025'), '2025-01-12')
    assert.equal(parseFlexibleDate(45658), '2025-01-01')
    assert.equal(parseFlexibleDate('2026-01-31T10:00:00.000Z'), '2026-01-31')
    assert.equal(parseFlexibleDate('31/02/2026'), null)
    assert.equal(parseFlexibleDate('not a date'), null)
    assert.equal(parseFlexibleDate(''), null)
})

// ---------------------------------------------------------------- phone
test('phone normalisation', () => {
    assert.equal(normalizePhone('98765 43210'), '+919876543210')
    assert.equal(normalizePhone('09876543210'), '+919876543210')
    assert.equal(normalizePhone('+91-98765-43210'), '+919876543210')
    assert.equal(normalizePhone('919876543210'), '+919876543210')
    assert.equal(normalizePhone('9876543210.0'), '+919876543210')
    assert.equal(normalizePhone('+1 415 555 0100'), '+14155550100')
    assert.equal(normalizePhone('12345'), null)
    assert.equal(normalizePhone('1234567890'), null) // not a valid Indian mobile prefix
    assert.equal(normalizePhone(''), null)
    assert.ok(isValidEmail('a@b.co'))
    assert.ok(!isValidEmail('a@b'))
})

// ---------------------------------------------------------------- membership
test('an expired membership never shows as active', () => {
    const now = new Date('2026-03-10T06:00:00Z')
    assert.equal(getEffectiveStatus({ status: 'Active', expiryDate: '2026-03-09' }, now), MEMBER_STATUS.EXPIRED)
    assert.equal(getEffectiveStatus({ status: 'Active', is_active: true, expiryDate: '2026-03-09' }, now), MEMBER_STATUS.EXPIRED)
    assert.equal(getEffectiveStatus({ status: 'Active', expiryDate: '2026-03-10' }, now), MEMBER_STATUS.ACTIVE, 'expiry day itself is valid')
    assert.equal(getEffectiveStatus({ status: 'Active' }, now), MEMBER_STATUS.ACTIVE, 'open-ended')
    assert.equal(getEffectiveStatus({ status: 'Suspended', expiryDate: '2027-01-01' }, now), MEMBER_STATUS.SUSPENDED)
    assert.equal(getEffectiveStatus({ status: 'Pending' }, now), MEMBER_STATUS.PENDING)
    assert.equal(daysUntilExpiry({ expiryDate: '2026-03-17' }, now), 7)
    assert.equal(daysUntilExpiry({ expiryDate: '2026-03-08' }, now), -2)
})

test('expiry uses the gym timezone at the day boundary', () => {
    const now = new Date('2026-03-10T20:00:00Z') // already 11 March in India
    assert.equal(getEffectiveStatus({ status: 'Active', expiryDate: '2026-03-10' }, now, 'Asia/Kolkata'), MEMBER_STATUS.EXPIRED)
    assert.equal(getEffectiveStatus({ status: 'Active', expiryDate: '2026-03-10' }, now, 'UTC'), MEMBER_STATUS.ACTIVE)
})

test('legacy status values are normalised', () => {
    assert.equal(normalizeStoredStatus({ status: 'active' }), 'Active')
    assert.equal(normalizeStoredStatus({ status: 'Unpaid' }), 'Pending')
    assert.equal(normalizeStoredStatus({ status: 'Expiring' }), 'Active')
    assert.equal(normalizeStoredStatus({ status: 'Active', is_active: false }), 'Inactive')
    assert.equal(normalizeStoredStatus({}), 'Pending')
})

test('dues are derived from fee and amount paid', () => {
    assert.deepEqual(computeDues(1000, 0), { fee: 1000, paid: 0, outstanding: 1000, paymentStatus: 'Unpaid' })
    assert.deepEqual(computeDues(1000, 400), { fee: 1000, paid: 400, outstanding: 600, paymentStatus: 'Partial' })
    assert.deepEqual(computeDues('1,000', '1000'), { fee: 1000, paid: 1000, outstanding: 0, paymentStatus: 'Paid' })
    assert.equal(computeDues(1000, 1500).outstanding, 0)
    assert.equal(computeDues(-5, 0).fee, 0)
})

test('plan durations', () => {
    assert.equal(addDuration('2026-01-31', 1), '2026-02-28')
    assert.equal(addDuration('2026-03-15', 12), '2027-03-15')
    assert.equal(cycleToMonths('Yearly'), 12)
    assert.equal(cycleToMonths('Quarterly'), 3)
    assert.equal(cycleToMonths('Monthly'), 1)
})

// ---------------------------------------------------------------- schedule
test('schedules support several muscle groups per day and legacy shapes', () => {
    const s = normalizeSchedule({ Mon: 'Chest, Shoulders', tuesday: ['Back', 'back', 'Arms'], Wed: 'Rest', Thursday: '' })
    assert.deepEqual(s.Monday, ['Chest', 'Shoulders'])
    assert.deepEqual(s.Tuesday, ['Back', 'Arms'])
    assert.deepEqual(s.Wednesday, [])
    assert.deepEqual(s.Thursday, [])
    assert.deepEqual(getPlannedWorkout({ weeklySchedule: { Friday: ['Shoulders', 'Arms'] } }, 'Friday'), ['Shoulders', 'Arms'])
    assert.deepEqual(normalizeDayEntry('chest + triceps'), ['Chest', 'Triceps'])
})

test('"No Fixed Schedule" yields no planned workout', () => {
    assert.equal(getMemberSchedule({ noFixedSchedule: true, schedule: { Monday: ['Chest'] } }).noFixedSchedule, true)
    assert.equal(getMemberSchedule({ schedule: 'Flexible' }).noFixedSchedule, true)
    assert.equal(getMemberSchedule({}).noFixedSchedule, true)
    assert.deepEqual(getPlannedWorkout({ noFixedSchedule: true, schedule: { Monday: ['Chest'] } }, 'Monday'), [])
})

// ---------------------------------------------------------------- occupancy vs demand
const NOW = new Date('2026-03-10T12:00:00Z')
const session = (member, workout, minsAgo = 20, extra = {}) => ({
    id: `s-${member}-${minsAgo}`, member_id: member, gymId: 'g1',
    check_in_time: new Date(NOW.getTime() - minsAgo * 60000).toISOString(), check_out_time: null, status: 'Active', actual_workout: workout, ...extra,
})

test('10 members doing Chest + Shoulders → occupancy 10, chest 10, shoulders 10', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => session(`m${i}`, ['Chest', 'Shoulders']))
    assert.equal(countOccupancy(sessions, NOW), 10)
    const zones = computeDemand(sessions, null, NOW)
    const by = Object.fromEntries(zones.map(z => [z.muscleGroup, z.members]))
    assert.equal(by.Chest, 10)
    assert.equal(by.Shoulders, 10)
    assert.equal(by.Legs, 0)
    assert.equal(zones.reduce((a, z) => a + z.members, 0), 20, 'demand sums to 20 but occupancy stays 10')
})

test('occupancy counts unique members and ignores completed or stale sessions', () => {
    const sessions = [
        session('a', ['Legs']),
        session('a', ['Legs'], 5),                                             // duplicate open row for the same member
        session('b', ['Back'], 30, { check_out_time: NOW.toISOString(), status: 'Completed' }),
        session('c', ['Core'], 30, { status: 'Completed' }),                   // completed without timestamp
        session('d', ['Arms'], 600),                                           // abandoned 10h ago
    ]
    assert.equal(countOccupancy(sessions, NOW), 1)
    assert.equal(getLiveSessions(sessions, NOW)[0].member_id, 'a')
    const by = Object.fromEntries(computeDemand(sessions, null, NOW).map(z => [z.muscleGroup, z.members]))
    assert.deepEqual([by.Legs, by.Back, by.Core, by.Arms], [1, 0, 0, 0])
    assert.ok(isStaleSession(sessions[4], NOW))
    assert.ok(!isOpenSession(sessions[2]))
})

test('custom facilities, synonyms and capacity', () => {
    const sessions = [session('a', ['Biceps', 'Swimming']), session('b', ['Swimming']), session('c', ['Push'])]
    const zones = computeDemand(sessions, [
        { id: 'pool', name: 'Pool', muscleGroup: 'Swimming', capacity: 4, isActive: true },
        { id: 'arms', name: 'Arms', muscleGroup: 'Arms', isActive: true },
        { id: 'chest', name: 'Chest', muscleGroup: 'Chest', capacity: '', isActive: true },
        { id: 'off', name: 'Sauna', muscleGroup: 'Sauna', isActive: false },
    ], NOW)
    assert.equal(zones.length, 3)
    const pool = zones.find(z => z.id === 'pool')
    assert.equal(pool.members, 2)
    assert.equal(pool.demand, 50)
    assert.equal(zones.find(z => z.id === 'arms').members, 1)
    assert.equal(zones.find(z => z.id === 'arms').demand, null, 'no capacity → no invented percentage')
    assert.equal(zones.find(z => z.id === 'chest').members, 1)
    assert.equal(demandLevel(5, null).percent, null)
})

test('duration is only reported for sessions with a real checkout', () => {
    assert.equal(sessionDurationMinutes({ check_in_time: '2026-03-10T10:00:00Z', check_out_time: '2026-03-10T11:15:00Z', method_out: 'Member' }), 75)
    assert.equal(sessionDurationMinutes({ check_in_time: '2026-03-10T10:00:00Z', check_out_time: '2026-03-10T14:00:00Z', method_out: 'Auto' }), null)
    assert.equal(sessionDurationMinutes({ check_in_time: '2026-03-10T10:00:00Z', check_out_time: null }), null)
})

// ---------------------------------------------------------------- import
test('import: intelligent column detection', () => {
    const map = detectColumnMapping(['Member Name', 'Mobile No.', 'E-mail ID', 'Package', 'Date of Joining', 'Valid Till', 'Total Amount', 'Paid', 'Balance', 'Coach', 'Member ID', 'Notes'])
    assert.equal(map.name, 'Member Name')
    assert.equal(map.phone, 'Mobile No.')
    assert.equal(map.email, 'E-mail ID')
    assert.equal(map.plan, 'Package')
    assert.equal(map.startDate, 'Date of Joining')
    assert.equal(map.expiryDate, 'Valid Till')
    assert.equal(map.fee, 'Total Amount')
    assert.equal(map.amountPaid, 'Paid')
    assert.equal(map.outstanding, 'Balance')
    assert.equal(map.trainer, 'Coach')
    assert.equal(map.sourceId, 'Member ID')
})

test('import: validation, duplicates, dates, phones, plan and trainer mapping', () => {
    const raw = [
        { N: 'Asha Rao', P: '9876543210', E: 'asha@example.com', Pl: 'Gold', S: '01/01/2026', X: '31/12/2026', F: '12000', A: '5000', T: 'Ravi' },
        { N: 'Dup Email', P: '9876500000', E: 'ASHA@example.com', Pl: 'Gold', S: '', X: '' },
        { N: 'Existing Phone', P: '+91 90000 00001', E: '', Pl: 'Silver' },
        { N: 'Bad Phone', P: '12345', E: '', Pl: 'Gold' },
        { N: 'Bad Date', P: '9876511111', E: '', Pl: 'Gold', S: '45/13/2026' },
        { N: '', P: '9876522222', E: '' },
        { N: 'Lapsed', P: '9876533333', E: '', Pl: 'Gold', S: '2025-01-01', X: '2025-02-01', T: 'Nobody' },
        { N: '', P: '', E: '' },
        { N: 'Backwards', P: '9876544444', S: '2026-02-01', X: '2026-01-01' },
    ]
    const mapping = { name: 'N', phone: 'P', email: 'E', plan: 'Pl', startDate: 'S', expiryDate: 'X', fee: 'F', amountPaid: 'A', trainer: 'T' }
    const { rows, summary } = validateImportRows(applyMapping(raw, mapping), {
        existingPhones: new Set(['+919000000001']),
        plans: { gold: { id: 'p1', name: 'Gold', price: 12000 } },
        trainers: { ravi: { id: 't1', name: 'Ravi' } },
        today: '2026-03-10',
    })
    assert.equal(summary.skippedBlank, 1)
    assert.equal(summary.total, 8)
    const byName = Object.fromEntries(rows.map(r => [r.data.name || `row${r.rowNumber}`, r]))

    const asha = byName['Asha Rao']
    assert.equal(asha.status, 'READY')
    assert.equal(asha.data.phone, '+919876543210')
    assert.equal(asha.data.startDate, '2026-01-01')
    assert.equal(asha.data.expiryDate, '2026-12-31')
    assert.equal(asha.data.outstanding, 7000)
    assert.equal(asha.data.paymentStatus, 'Partial')
    assert.equal(asha.data.planId, 'p1')
    assert.equal(asha.data.trainerId, 't1')

    assert.equal(byName['Dup Email'].status, 'ERROR')
    assert.match(byName['Dup Email'].errors.join(), /same e-mail as row 2/)
    assert.match(byName['Existing Phone'].errors.join(), /already belongs/)
    assert.match(byName['Bad Phone'].errors.join(), /Invalid phone/)
    assert.match(byName['Bad Date'].errors.join(), /not a valid date/)
    assert.equal(byName['row7'].status, 'ERROR')
    assert.match(byName['Backwards'].errors.join(), /before the start date/)

    const lapsed = byName['Lapsed']
    assert.equal(lapsed.status, 'WARNING')
    assert.equal(lapsed.data.expired, true)
    assert.equal(lapsed.data.trainerId, null)
    assert.match(lapsed.warnings.join(), /Trainer "Nobody" not found/)

    const csv = buildErrorReportCsv(rows)
    assert.ok(csv.split('\n').length >= 7)
    assert.ok(!csv.includes('Asha Rao'), 'clean rows are not in the error report')
})

test('import: error report neutralises spreadsheet formulas', () => {
    const csv = buildErrorReportCsv([{ rowNumber: 2, status: 'ERROR', data: { name: '=HYPERLINK("http://x")', phone: '', email: '' }, errors: ['x'], warnings: [] }])
    assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`))
})
