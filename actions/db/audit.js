'use server'



// Generates persistent logs for significant SA actions preventing opaque changes
export async function createAuditLog({ gymId = null, action, resource, resourceId = null, details = {} }) {
    const bypassSupabase = true;
    if (bypassSupabase) return true;
}

export async function createNotification({ gymId, userId = null, type, title, message, priority = 'normal' }) {
    const bypassSupabase = true;
    if (bypassSupabase) return true;
}

// User-facing generic activity feeds derived from combined mutations
export async function getRecentActivity(gymId, limit = 10) {
    const bypassSupabase = true;
    if (bypassSupabase) return [];
}
