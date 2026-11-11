-- Renaming a company.
--
-- The redesigned Settings page is one list, and its first row is the company
-- name: it goes on quotes, on invitations and on the website form, so it has
-- to be editable by the people it belongs to. `companies` is SELECT-only for
-- authenticated users by design, so this follows the pattern the workspace
-- migration already set: a checked SECURITY DEFINER function in crm_private,
-- a thin SECURITY INVOKER wrapper in public, and no direct table write.
BEGIN;

CREATE FUNCTION crm_private.rename_company(_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target uuid := crm_private.current_company(); clean text; BEGIN
 IF auth.uid() IS NULL OR target IS NULL THEN RAISE EXCEPTION 'No company selected'; END IF;
 IF NOT crm_private.company_admin(target) THEN
   RAISE EXCEPTION 'Only an administrator of this company can rename it';
 END IF;
 clean := btrim(coalesce(_name, ''));
 IF length(clean) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'Enter a company name (1–200 characters)';
 END IF;
 UPDATE public.companies SET name = clean WHERE id = target;
 RETURN clean;
END $$;

CREATE FUNCTION public.rename_crm_company(_name text) RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT crm_private.rename_company(_name) $$;

REVOKE ALL ON FUNCTION crm_private.rename_company(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crm_private.rename_company(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rename_crm_company(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_crm_company(text) TO authenticated, service_role;

COMMIT;
