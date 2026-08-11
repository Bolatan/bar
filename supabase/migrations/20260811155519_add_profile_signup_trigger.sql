/*
# Add automatic staff profile creation

## Purpose
Ensures every new email/password account receives a staff profile immediately after signup.

## Database Changes
- Adds a trigger function that creates a `profiles` row from `auth.users` metadata.
- Adds the `profiles_insert_own` policy for authenticated users.

## Security
- The trigger runs with elevated database permissions only for the profile creation step.
- New users always start with the `staff` role; role elevation must be performed separately by an owner.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'Staff'), '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    'staff'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);