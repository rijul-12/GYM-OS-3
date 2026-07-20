// ===========================================================================
// ATTENDANCE PROVIDER ARCHITECTURE
// Every provider (QR, biometric, face-recog, NFC, RFID, webhook, CSV, ...)
// implements the same shape. Business logic NEVER touches provider-specific
// code — it only calls the generic engine below.
//
// To add a new provider in the future:
//   1. Add an object to PROVIDERS with the fields you need.
//   2. That’s it. UI, connect flow, sync, logs — all wire up automatically.
// ===========================================================================

// -- Field catalogue (single source of truth for the modal form) -----------
export const FIELD_CATALOG = {
  providerName:      { label: 'Provider name',      type: 'text',   group: 'Identity' },
  deviceName:        { label: 'Device name',        type: 'text',   group: 'Identity' },
  deviceLocation:    { label: 'Device location',    type: 'text',   group: 'Identity' },
  apiBaseUrl:        { label: 'API base URL',       type: 'text',   group: 'Connection', placeholder: 'https://api.provider.com' },
  webhookUrl:        { label: 'Webhook URL',        type: 'text',   group: 'Connection', placeholder: 'https://your-gym.com/webhook' },
  apiKey:            { label: 'API key',            type: 'secret', group: 'Auth' },
  secretKey:         { label: 'Secret key',         type: 'secret', group: 'Auth' },
  accessToken:       { label: 'Access token',       type: 'secret', group: 'Auth' },
  username:          { label: 'Username',           type: 'text',   group: 'Auth' },
  password:          { label: 'Password',           type: 'secret', group: 'Auth' },
  deviceId:          { label: 'Device ID',          type: 'text',   group: 'Identity' },
  organizationId:    { label: 'Organization ID',    type: 'text',   group: 'Tenancy' },
  branchId:          { label: 'Branch ID',          type: 'text',   group: 'Tenancy' },
  siteId:            { label: 'Site ID',            type: 'text',   group: 'Tenancy' },
  timezone:          { label: 'Time zone',          type: 'select', group: 'Behavior', options: ['America/Los_Angeles','America/New_York','Europe/London','Asia/Kolkata','Asia/Singapore'] },
  attendanceMode:    { label: 'Attendance mode',    type: 'select', group: 'Behavior', options: ['Check-in only','Check-out only','Both','Auto-detect'] },
  realtimeSync:      { label: 'Real-time sync',     type: 'switch', group: 'Behavior' },
  automaticSync:     { label: 'Automatic sync',     type: 'switch', group: 'Behavior' },
  syncFrequency:     { label: 'Sync frequency',     type: 'select', group: 'Behavior', options: ['30 seconds','1 minute','5 minutes','15 minutes','1 hour'] },
  webhookSecret:     { label: 'Webhook secret',     type: 'secret', group: 'Auth' },
  connectionTimeout: { label: 'Connection timeout (s)', type: 'number', group: 'Behavior', default: 30 },
  retryAttempts:     { label: 'Retry attempts',     type: 'number', group: 'Behavior', default: 3 },
}

// -- Provider registry -----------------------------------------------------
// `fields` = required, `optional` = shown collapsed. Any provider not listed
// still works; the engine treats it generically.
export const PROVIDERS = [
  {
    id: 'qr', name: 'QR Code', category: 'qr', logo: 'QR', color: '#22c55e',
    tagline: 'Native member-facing QR check-in',
    description: 'Zero-hardware attendance. Members scan a QR at the front desk or via the member portal.',
    fields: ['providerName','deviceName','deviceLocation','timezone','attendanceMode'],
    optional: ['webhookUrl','webhookSecret','realtimeSync','automaticSync','syncFrequency'],
    features: { realtime: true, batch: false, webhook: true, biometric: false },
    firmware: 'v2.4.1', model: 'GymOS-QR/1',
  },
  {
    id: 'manual', name: 'Manual Attendance', category: 'manual', logo: 'M', color: '#a3a3a3',
    tagline: 'Front-desk entry by staff',
    description: 'Staff manually record check-ins from the admin dashboard. No hardware, no APIs.',
    fields: ['providerName','deviceLocation','timezone','attendanceMode'],
    optional: ['automaticSync'],
    features: { realtime: true, batch: true, webhook: false, biometric: false },
    firmware: 'n/a', model: 'GymOS-Manual/1',
  },
  {
    id: 'zkteco', name: 'ZKTeco', category: 'biometric', logo: 'Z', color: '#3b82f6',
    tagline: 'Fingerprint & face biometric terminals',
    description: 'Enterprise biometric terminals with fingerprint, face, and card support.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','apiKey','deviceId','timezone','attendanceMode'],
    optional: ['username','password','webhookUrl','webhookSecret','realtimeSync','automaticSync','syncFrequency','connectionTimeout','retryAttempts'],
    features: { realtime: true, batch: true, webhook: true, biometric: true },
    firmware: 'v6.60.1.15', model: 'ZK-K40 Pro',
  },
  {
    id: 'essl', name: 'eSSL', category: 'biometric', logo: 'E', color: '#f97316',
    tagline: 'Cloud biometric attendance',
    description: 'Cloud-managed biometric devices with real-time push events.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','username','password','deviceId','organizationId','timezone'],
    optional: ['branchId','webhookUrl','realtimeSync','automaticSync','syncFrequency','retryAttempts'],
    features: { realtime: true, batch: true, webhook: true, biometric: true },
    firmware: 'v4.2.9', model: 'eSSL X990',
  },
  {
    id: 'matrix', name: 'Matrix', category: 'biometric', logo: 'X', color: '#8b5cf6',
    tagline: 'Enterprise access control',
    description: 'Access control + attendance combined. Supports RFID + biometric.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','apiKey','secretKey','deviceId','siteId','timezone'],
    optional: ['organizationId','branchId','webhookUrl','realtimeSync','automaticSync','syncFrequency','connectionTimeout','retryAttempts'],
    features: { realtime: true, batch: true, webhook: true, biometric: true },
    firmware: 'v3.11.2', model: 'MATRIX-COSEC ARGO FACE',
  },
  {
    id: 'cpplus', name: 'CP Plus', category: 'biometric', logo: 'C', color: '#ef4444',
    tagline: 'Face recognition terminals',
    description: 'AI-driven face recognition with liveness detection.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','username','password','deviceId','timezone','attendanceMode'],
    optional: ['webhookUrl','realtimeSync','automaticSync','syncFrequency','retryAttempts'],
    features: { realtime: true, batch: true, webhook: true, biometric: true },
    firmware: 'v2.8.1', model: 'CP-VTA-F42TS',
  },
  {
    id: 'nfc', name: 'NFC Cards', category: 'card', logo: 'N', color: '#0ea5e9',
    tagline: 'Tap-to-check-in NFC readers',
    description: 'Cheap, reliable NFC card system. Great for large gyms.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','apiKey','deviceId','timezone'],
    optional: ['webhookUrl','webhookSecret','realtimeSync','automaticSync','syncFrequency'],
    features: { realtime: true, batch: false, webhook: true, biometric: false },
    firmware: 'v1.4.0', model: 'NFC-READER-A9',
  },
  {
    id: 'rfid', name: 'RFID Cards', category: 'card', logo: 'R', color: '#eab308',
    tagline: 'Long-range RFID access',
    description: 'RFID wristbands / cards for large facilities.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','apiKey','deviceId','timezone'],
    optional: ['webhookUrl','realtimeSync','automaticSync','syncFrequency'],
    features: { realtime: true, batch: false, webhook: true, biometric: false },
    firmware: 'v2.1.3', model: 'RFID-UHF-K8',
  },
  {
    id: 'face', name: 'Face Recognition', category: 'face', logo: 'F', color: '#ec4899',
    tagline: 'Contactless AI check-in',
    description: 'Camera-based face recognition. GDPR-safe consent flow built in.',
    fields: ['providerName','deviceName','deviceLocation','apiBaseUrl','apiKey','deviceId','timezone','attendanceMode'],
    optional: ['secretKey','webhookUrl','realtimeSync','automaticSync','syncFrequency'],
    features: { realtime: true, batch: false, webhook: true, biometric: true },
    firmware: 'v3.0.0', model: 'FR-CAM-4K',
  },
  {
    id: 'custom', name: 'Custom API', category: 'api', logo: 'API', color: '#14b8a6',
    tagline: 'Bring your own attendance system',
    description: 'Point any REST-based attendance system at GymOS via our generic adapter.',
    fields: ['providerName','apiBaseUrl','webhookUrl','apiKey','secretKey','timezone'],
    optional: ['accessToken','username','password','deviceId','organizationId','branchId','siteId','webhookSecret','attendanceMode','realtimeSync','automaticSync','syncFrequency','connectionTimeout','retryAttempts'],
    features: { realtime: true, batch: true, webhook: true, biometric: false },
    firmware: 'depends', model: 'Custom',
  },
  {
    id: 'future', name: 'Future Provider', category: 'future', logo: '+', color: '#737373',
    tagline: 'Reserved slot for upcoming integrations',
    description: 'Apple Wallet, Google Wallet, turnstiles, mobile check-in, CSV/Excel import — add without redeploying.',
    fields: [],
    optional: [],
    features: { realtime: false, batch: false, webhook: false, biometric: false },
    firmware: '-', model: '-',
    disabled: true,
  },
]

export const providerById = (id) => PROVIDERS.find(p => p.id === id)

// -- Test-connection simulator --------------------------------------------
// Any real provider implements this signature: async function*() yielding
// { step, status: 'pending'|'ok'|'err', message }.
export const TEST_STEPS = [
  { key: 'connect',   label: 'Establishing connection…',     delay: 700 },
  { key: 'auth',      label: 'Authenticating credentials…',  delay: 900 },
  { key: 'device',    label: 'Fetching device info…',        delay: 750 },
  { key: 'caps',      label: 'Verifying capabilities…',      delay: 550 },
  { key: 'ready',     label: 'Handshake complete',            delay: 400 },
]

// Returns realistic-looking device data for any provider once connected.
export function mockDeviceInfo(provider) {
  const octets = Array.from({length: 4}, () => 1 + Math.floor(Math.random() * 254))
  return {
    deviceName: provider.name + ' · Front Desk',
    model: provider.model || 'GENERIC-1',
    firmware: provider.firmware || 'v1.0.0',
    onlineStatus: 'Online',
    ipAddress: octets.join('.'),
    checkInsToday: 84 + Math.floor(Math.random() * 60),
    checkOutsToday: 71 + Math.floor(Math.random() * 55),
    lastSync: 'just now',
    deviceTime: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    battery: provider.category === 'biometric' || provider.category === 'face' ? Math.floor(70 + Math.random() * 30) : null,
    health: 'Excellent',
  }
}
