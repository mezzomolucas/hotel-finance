-- Run these commands in your Supabase SQL Editor to update the database schema

-- Add payment_date column to incomes table
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add payment_date column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Optional: Backfill payment_date for existing records if needed
-- For incomes, default to check_in date if payment_date is null
UPDATE incomes 
SET payment_date = check_in 
WHERE payment_date IS NULL;

-- For expenses, default to due_date if payment_date is null and status is 'Paid'
UPDATE expenses 
SET payment_date = due_date 
WHERE payment_date IS NULL AND status = 'Paid';
