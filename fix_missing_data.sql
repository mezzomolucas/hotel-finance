-- Run this in Supabase SQL Editor to assign orphan records to your user
-- Replace 'YOUR_USER_ID_HERE' with your actual User ID from Authentication > Users

-- 1. Update Incomes
UPDATE incomes 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- 2. Update Expenses
UPDATE expenses 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- 3. Update Receivables
UPDATE receivables 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- Note: If running from the SQL Editor dashboard, auth.uid() might not work as expected since it's a server-side context.
-- You should copy your User ID (UUID) from the Auth tab and paste it directly:
-- Example: SET user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
