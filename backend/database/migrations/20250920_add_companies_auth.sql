-- Migration: add auth columns to companies to support employer register/login
-- Safe to run multiple times.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS password_hash varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name varchar(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- If table is empty, you can enforce constraints directly. If not, fill placeholders first.
-- Uncomment the following if you already have rows without these values.
-- UPDATE companies
-- SET email = CONCAT('company+', id::text, '@example.com')
-- WHERE email IS NULL;
--
-- UPDATE companies
-- SET password_hash = '$2a$12$placeholderplaceholderplaceholderpl'
-- WHERE password_hash IS NULL;

-- Enforce NOT NULL and UNIQUE for new setups (comment out if you have legacy rows).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='email') THEN
    BEGIN
      EXECUTE 'ALTER TABLE companies ALTER COLUMN email SET NOT NULL';
    EXCEPTION WHEN others THEN NULL; -- ignore if fails due to existing nulls
    END;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'companies'::regclass AND conname = 'companies_email_unique'
    ) THEN
      BEGIN
        EXECUTE 'ALTER TABLE companies ADD CONSTRAINT companies_email_unique UNIQUE (email)';
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='password_hash') THEN
    BEGIN
      EXECUTE 'ALTER TABLE companies ALTER COLUMN password_hash SET NOT NULL';
    EXCEPTION WHEN others THEN NULL; -- ignore if fails due to existing nulls
    END;
  END IF;
END$$;
