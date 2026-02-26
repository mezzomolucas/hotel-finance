DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Tenta pegar o ID do usuário que fez login mais recentemente
  SELECT id INTO target_user_id FROM auth.users ORDER BY last_sign_in_at DESC LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    -- Atualiza registros que estão sem dono (NULL) para o usuário encontrado
    UPDATE incomes SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE expenses SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE receivables SET user_id = target_user_id WHERE user_id IS NULL;
  END IF;
END $$;
