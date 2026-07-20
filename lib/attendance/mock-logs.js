// Realistic attendance log rows (mock). Ready to be replaced by a query
// against a `attendance_events` table.
const NAMES = ['Alexander Cross','Sofia Martinez','Marcus Reid','Priya Sharma','David Chen','Isabella Rossi','Jamal Wright','Emma Larsen','Rahul Kumar','Ankit Singh','Neha Sharma','Amelia Chen','Diego Costa','Aisha Karim','Ryan Blackwood','Nina Petrova']
const SOURCES = [
  { id: 'qr',     label: 'QR Code',       color: '#22c55e' },
  { id: 'zkteco', label: 'ZKTeco',        color: '#3b82f6' },
  { id: 'essl',   label: 'eSSL',          color: '#f97316' },
  { id: 'matrix', label: 'Matrix',        color: '#8b5cf6' },
  { id: 'cpplus', label: 'CP Plus',       color: '#ef4444' },
  { id: 'manual', label: 'Manual',        color: '#a3a3a3' },
  { id: 'nfc',    label: 'NFC Cards',     color: '#0ea5e9' },
  { id: 'face',   label: 'Face Recognition', color: '#ec4899' },
]
const TYPES = ['Check In','Check Out']
const STATUSES = [
  { s: 'Success', w: 82 },
  { s: 'Failed',  w: 8 },
  { s: 'Retry',   w: 10 },
]
const REASONS = {
  Success: [null],
  Failed:  ['Device offline','Timeout after 30s','Auth token expired','Duplicate scan (<10s)'],
  Retry:   ['Retry 1/3 · Reconnecting','Retry 2/3 · Backoff 5s','Queued for next sync window'],
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const pickWeighted = (arr) => {
  const t = arr.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * t
  for (const x of arr) { r -= x.w; if (r <= 0) return x.s }
  return arr[0].s
}

function pad(n) { return String(n).padStart(2, '0') }

export function generateLogs(n = 40) {
  const now = new Date()
  const rows = []
  for (let i = 0; i < n; i++) {
    const t = new Date(now.getTime() - i * (60000 + Math.random() * 240000))
    const source = pick(SOURCES)
    const status = pickWeighted(STATUSES)
    rows.push({
      id: `evt_${t.getTime()}_${i}`,
      time: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
      timestamp: t.toISOString(),
      member: pick(NAMES),
      type: pick(TYPES),
      source: source.label,
      sourceColor: source.color,
      device: `${source.label}-${String(1 + Math.floor(Math.random() * 4)).padStart(2, '0')}`,
      status,
      reason: pick(REASONS[status] || [null]),
    })
  }
  return rows
}

export const SOURCE_META = SOURCES
