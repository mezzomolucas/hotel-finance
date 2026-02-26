-- Enable pgcrypto extension for password hashing
create extension if not exists "pgcrypto";

-- Update the existing user's password and confirm their email
update auth.users
set 
  encrypted_password = crypt('Leoarturjoao1805_', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now(),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'
where email = 'lucas.mezzomo@universo.univates.br';
