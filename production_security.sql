-- SECURE YOUR DATA FOR PRODUCTION
-- Run this script in the Supabase SQL Editor before launching your app.

-- 1. Disable the insecure "allow all" policies created during development
drop policy if exists "Enable all access for all users" on public.incomes;
drop policy if exists "Enable all access for all users" on public.expenses;
drop policy if exists "Enable all access for all users" on public.receivables;

-- 2. Create secure policies that restrict access to authenticated users only

-- INCOMES TABLE
create policy "Allow authenticated users to view incomes"
on public.incomes for select
to authenticated
using (true);

create policy "Allow authenticated users to insert incomes"
on public.incomes for insert
to authenticated
with check (true);

create policy "Allow authenticated users to update incomes"
on public.incomes for update
to authenticated
using (true);

create policy "Allow authenticated users to delete incomes"
on public.incomes for delete
to authenticated
using (true);

-- EXPENSES TABLE
create policy "Allow authenticated users to view expenses"
on public.expenses for select
to authenticated
using (true);

create policy "Allow authenticated users to insert expenses"
on public.expenses for insert
to authenticated
with check (true);

create policy "Allow authenticated users to update expenses"
on public.expenses for update
to authenticated
using (true);

create policy "Allow authenticated users to delete expenses"
on public.expenses for delete
to authenticated
using (true);

-- RECEIVABLES TABLE
create policy "Allow authenticated users to view receivables"
on public.receivables for select
to authenticated
using (true);

create policy "Allow authenticated users to insert receivables"
on public.receivables for insert
to authenticated
with check (true);

create policy "Allow authenticated users to update receivables"
on public.receivables for update
to authenticated
using (true);

create policy "Allow authenticated users to delete receivables"
on public.receivables for delete
to authenticated
using (true);

-- Note: If you want even stricter security (e.g., multi-tenant where users only see their own data),
-- you would add a 'user_id' column to each table and use: using (auth.uid() = user_id);
