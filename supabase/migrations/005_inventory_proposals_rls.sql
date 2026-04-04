-- ============================================================
-- CRM Negozi - Inventory Proposals RLS
-- ============================================================

ALTER TABLE public.inventory_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_proposals_select ON public.inventory_proposals
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY inventory_proposals_insert ON public.inventory_proposals
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY inventory_proposals_update ON public.inventory_proposals
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY inventory_proposal_items_select ON public.inventory_proposal_items
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY inventory_proposal_items_insert ON public.inventory_proposal_items
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY inventory_proposal_items_update ON public.inventory_proposal_items
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
