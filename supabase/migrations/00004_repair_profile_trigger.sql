-- Ensure profile creation is handled by a privileged auth trigger.
-- Run this migration once in projects that were initialized before 00003.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  extracted_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  extracted_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    split_part(COALESCE(NEW.email, NEW.phone, NEW.id::text), '@', 1)
  );

  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    extracted_username,
    CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();
