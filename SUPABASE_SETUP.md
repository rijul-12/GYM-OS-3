# GymOS Supabase Setup Guide

This guide explains how to connect your GymOS application to a live Supabase project for real authentication, replacing the local "Demo Mode".

## 1. Create a Supabase Project
1. Go to [database.new](https://database.new) and create a new project.
2. Select your region and enter a strong database password. Wait a few minutes for the database to provision.

## 2. Configure Environment Variables
Copy the `.env.example` file to create a new `.env.local` file in the root of the project:

```bash
cp .env.example .env.local
```

Inside `.env.local`, fill in the following values from your Supabase dashboard (Settings > API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...your-service-role-key...
```

> **Note:** Once these variables are set, GymOS will automatically switch from "Demo Mode" to "Live Database Mode".

## 3. Create Required Auth Roles

GymOS uses four distinct roles to control dashboard access. You must create these users manually in your Supabase Auth dashboard and assign them the correct role metadata.

### Creating the Setup Users
In your Supabase dashboard, go to **Authentication > Users** and click **Add User**.
Create four users with these emails (or your own) and use a temporary password:
1. `superadmin@gymos.com`
2. `owner@gymos.com`
3. `trainer@gymos.com`
4. `member@gymos.com`

### Injecting Role Metadata (Required)
GymOS uses the `user_metadata` JSON column to determine dashboard access. Since the Supabase dashboard UI does not currently let you edit `raw_user_meta_data`, you must run this SQL snippet in the Supabase **SQL Editor**:

```sql
-- Apply 'super_admin' role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('role', 'super_admin', 'name', 'Platform Admin') 
WHERE email = 'superadmin@gymos.com';

-- Apply 'owner' role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('role', 'owner', 'name', 'James Holloway') 
WHERE email = 'owner@gymos.com';

-- Apply 'trainer' role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('role', 'trainer', 'name', 'Ryan Blackwood') 
WHERE email = 'trainer@gymos.com';

-- Apply 'member' role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('role', 'member', 'name', 'Alexander Cross') 
WHERE email = 'member@gymos.com';
```

## 4. Test the Integration
1. Restart your local development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Attempt to log in with one of the accounts you created in Supabase.
4. You should be securely redirected to the appropriate dashboard!

---

## Technical Note: The Demo Mode Fallback
If you ever want to revert to the offline Demo Mode (e.g., to present without internet), simply rename `.env.local` to `.env.local.backup` and restart the server. GymOS automatically detects the missing variables and reactivates the mock login system.
