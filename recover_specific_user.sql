-- Este script força a atribuição de todos os dados sem dono para o seu email específico
-- Substitua o email abaixo se não for este o seu email de login
DO $$
DECLARE
  target_email TEXT := 'lucas.mezzomo@universo.univates.br';
  target_user_id uuid;
BEGIN
  -- Busca o ID do usuário pelo email
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- Atualiza Incomes (Entradas)
    UPDATE incomes 
    SET user_id = target_user_id 
    WHERE user_id IS NULL;

    -- Atualiza Expenses (Saídas)
    UPDATE expenses 
    SET user_id = target_user_id 
    WHERE user_id IS NULL;

    -- Atualiza Receivables (A Receber)
    UPDATE receivables 
    SET user_id = target_user_id 
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Dados recuperados com sucesso para o usuário: %', target_email;
  ELSE
    RAISE NOTICE 'Usuário não encontrado com o email: %', target_email;
  END IF;
END $$;
