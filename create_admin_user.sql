-- Enable pgcrypto extension for password hashing
create extension if not exists "pgcrypto";

-- Insert the admin user directly into auth.users
-- This bypasses the email confirmation process
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'lucas.mezzomo@universo.univates.br',
  crypt('Leoarturjoao1805_', gen_salt('bf')),
  now(), -- email_confirmed_at (automatically confirmed)
  null,
  null,
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
