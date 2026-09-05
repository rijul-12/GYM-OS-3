/**
 * Reusable Integration Service extracting provider-specific schemas.
 * Standardizes unstructured device payloads securely into BGM formatting.
 */
export function parseBiometricPayload(provider, payload) {
    switch (provider.toUpperCase()) {
        case 'ZKTECO':
            // ZKTeco standard pushes payload with `emp_code` and `punch_time`
            return {
                hardwareId: payload.emp_code || payload.pin,
                timestamp: new Date(payload.punch_time || payload.time).toISOString(),
                punchType: payload.punch_state === '0' ? 'check_in' : 'check_out',
                deviceIp: payload.ip || 'Unknown'
            }

        case 'ESSL':
            // eSSL pushes form-like JSON format using `userId` and `logDate`
            return {
                hardwareId: payload.userId,
                timestamp: new Date(payload.logDate).toISOString(),
                punchType: payload.direction === 'in' ? 'check_in' : 'check_out',
                deviceIp: payload.DeviceId || 'Unknown'
            }

        case 'CUSTOM REST':
        default:
            // Generic agnostic integration format for custom endpoints
            return {
                hardwareId: payload.member_id || payload.user_id,
                timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
                punchType: payload.type || 'check_in',
                deviceIp: payload.device_ip || 'REST_API'
            }
    }
}
