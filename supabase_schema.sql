-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Incomes Table
create table if not exists public.incomes (
  id uuid not null primary key default uuid_generate_v4(),
  guest_name text not null,
  check_in timestamp with time zone not null,
  check_out timestamp with time zone not null,
  daily_rate numeric not null,
  extra_consumption numeric default 0,
  total numeric not null,
  payment_method text not null,
  status text not null,
  invoice_issued boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Expenses Table
create table if not exists public.expenses (
  id uuid not null primary key default uuid_generate_v4(),
  description text not null,
  category text not null,
  amount numeric not null,
  due_date timestamp with time zone not null,
  status text not null,
  has_receipt boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Receivables Table
create table if not exists public.receivables (
  id uuid not null primary key default uuid_generate_v4(),
  source text not null,
  amount numeric not null,
  due_date timestamp with time zone not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.receivables enable row level security;

-- Create Policies (Allow all access for anon/public for demo purposes)
-- Note: In production, you should restrict this to authenticated users
create policy "Enable all access for all users" on public.incomes for all using (true) with check (true);
create policy "Enable all access for all users" on public.expenses for all using (true) with check (true);
create policy "Enable all access for all users" on public.receivables for all using (true) with check (true);
