-- Enable Row Level Security (RLS) on tables
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON incomes;

DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view their own receivables" ON receivables;
DROP POLICY IF EXISTS "Users can insert their own receivables" ON receivables;
DROP POLICY IF EXISTS "Users can update their own receivables" ON receivables;
DROP POLICY IF EXISTS "Users can delete their own receivables" ON receivables;

-- Re-create policies for 'incomes'
CREATE POLICY "Users can view their own incomes" ON incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes" ON incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes" ON incomes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes" ON incomes
  FOR DELETE USING (auth.uid() = user_id);

-- Re-create policies for 'expenses'
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Re-create policies for 'receivables'
CREATE POLICY "Users can view their own receivables" ON receivables
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receivables" ON receivables
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receivables" ON receivables
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receivables" ON receivables
  FOR DELETE USING (auth.uid() = user_id);
