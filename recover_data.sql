-- Execute este comando no SQL Editor do Supabase para recuperar seus dados
-- Ele vai atribuir todos os registros sem dono ao seu usuário atual

UPDATE incomes 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

UPDATE expenses 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

UPDATE receivables 
SET user_id = auth.uid() 
WHERE user_id IS NULL;
