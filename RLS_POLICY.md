# Row Level Security (RLS) Policies

GymOS relies implicitly on Postgres RLS mapped to Supabase Authentication JWTs. This document explains the exact security matrix that guarantees multi-tenant data isolation.

## Security Context
Whenever a user logs in, Supabase generates an access JWT. In Phase 1, we defined that this JWT contains a custom `user_metadata -> role` block, which maps exactly to `super_admin`, `owner`, `trainer`, or `member`.

RLS leverages that JWT role context across these 4 distinct vectors.

## Access Rules Matrix

### 1. The Super Admin
**Scope**: God-mode.
**Description**: Support members and GymOS developers can read, mutate, and delete data originating from any `gym_id` without restriction.
> **SQL Logic**: `(auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'`

### 2. The Gym Owner
**Scope**: Tenant-Bound.
**Description**: The owner controls their ecosystem natively. They can access any table row as long as it has a foreign key to their specific `gym_id`.
> **SQL Logic**: 
> `(auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'` AND 
> `gym_id IN (SELECT gym_id FROM owners WHERE id = auth.uid())`

### 3. The Trainer
**Scope**: Partial-Tenant Bound.
**Description**: Trainers are locked to their parent gym. However, their visibility is further filtered on a table-by-table basis:
- **Can See:** `members` where `members.trainer_id = auth.uid()`.
- **Can See:** `workout_plans` and `workout_logs` tied to those specific members.
- **Blocked:** Revenue (`payments`, `subscriptions`), or users belonging to other trainers.
> **SQL Logic**: 
> `(auth.jwt() -> 'user_metadata' ->> 'role') = 'trainer'` AND 
> `member_id IN (SELECT id FROM members WHERE trainer_id = auth.uid())`

### 4. The Member
**Scope**: Personal Isolation.
**Description**: Members never interact with cross-tenant context. Their view focuses entirely on equality to `auth.uid()`.
- **Can See:** Their own `members` profile.
- **Can See:** `attendance`, `workout_logs`, `subscriptions` WHERE `member_id = auth.uid()`.
> **SQL Logic**: 
> `(auth.jwt() -> 'user_metadata' ->> 'role') = 'member'` AND 
> `member_id = auth.uid()`

---

## The Default Policy Action
If none of the above policies are met, the database rigidly defaults to `DENY`. 
- No API key can bypass this from the client interface layer.
- `gym_id` manipulation (Tenant hopping) triggers instant denial from the Owner Policy since the `SELECT` cross-check fails.
