-- Opening a workspace, by the person who wants one.
--
-- create_company was gated on crm_private.platform_admins, which made the
-- self-serve onboarding impossible to finish: the account was created, the
-- card form was filled, nothing was charged, and the last step refused with
-- "Only software administrators can create companies". The owner has decided
-- the flow should complete, so any signed-in user may open a workspace and
-- becomes its administrator, exactly as a platform admin did before.
--
-- What this widens: anyone who can sign up can now create a company, and
-- there is deliberately no limit on how many — the owner's call. Each company
-- is still isolated by the same row-level policies, so this changes who may
-- create one, not who may see one. If that ever needs a ceiling, this
-- function is the only place it belongs.
BEGIN;

CREATE OR REPLACE FUNCTION crm_private.create_company(_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE created uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before opening a workspace'; END IF;
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Enter a company name (1–200 characters)'; END IF;
 INSERT INTO public.companies(name, created_by) VALUES(btrim(_name), auth.uid()) RETURNING id INTO created;
 INSERT INTO public.user_roles(company_id, user_id, role) VALUES(created, auth.uid(), 'admin');
 RETURN created;
END $$;

COMMIT;
