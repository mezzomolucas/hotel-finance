-- Add number_of_guests column to incomes table
alter table public.incomes 
add column if not exists number_of_guests integer default 1;
