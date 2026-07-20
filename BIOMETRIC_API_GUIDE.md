# GymOS Biometric Appliance Gateway

GymOS's centralized webhook REST adapter resolves the historical friction of integrating proprietary IoT door entry or generic turnstiles into a unified backend. This REST architecture operates asynchronously without coupling directly with GymOS Frontend logic.

## Endpoint Gateway
**POST** `https://[YOUR_VERCEL_DOMAIN]/api/webhooks/biometrics`

### Authentication Specification
You must bind a **Secret Key** locally on your physical ZKTeco / eSSL firmware console identical to what's defined internally inside your GymOS tenant Settings configuration. 
**Header Expected:**
`Authorization: [WEBHOOK_SECRET_KEY]`  *or*  `x-api-key: [WEBHOOK_SECRET_KEY]`

## Supported Hardware Formats

GymOS evaluates raw payload parameters predicting format types without manual specification!

### 1. Unified Generic Format (Recommended for Custom Pushes)
```json
{
  "member_id": "8bbbb9a-4c2s...", 
  "timestamp": "2024-11-20T08:33:45.312Z",
  "type": "check_in"
}
```

### 2. ZKTeco Series Appliances
ZKTeco firmware traditionally aggregates pushes inherently wrapping attendance logs identically to their software format. We resolve this automatically:
```json
{
  "emp_code": "0415A",
  "punch_time": "2024-11-20 08:33:45",
  "punch_state": "0", 
  "ip": "192.168.1.45"
}
```

### 3. eSSL Access Control 
eSSL frequently bounds logDate params over direction triggers.
```json
{
  "userId": "1001",
  "logDate": "11/20/2024 08:33 AM",
  "direction": "in",
  "DeviceId": "D01"
}
```

## Troubleshooting
If the endpoint evaluates `HTTP 404 Member Mapping Failure`, ensure your `hardwareId/emp_code/userId` natively matches a registered GymOS `biometric_id` attribute against that authenticated tenant. You cannot send payloads anonymously predicting bounds natively.
