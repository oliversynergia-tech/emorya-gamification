DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    INNER JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'app_role'
      AND enum.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin' BEFORE 'admin';
  END IF;
END $$;
