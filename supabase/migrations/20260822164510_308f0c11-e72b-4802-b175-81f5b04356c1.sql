-- Opening stock recorded through the engine
CREATE OR REPLACE FUNCTION public.create_product(
  p_name text,
  p_unit text DEFAULT 'pcs',
  p_purchase_price numeric DEFAULT 0,
  p_selling_price numeric DEFAULT 0,
  p_initial_stock numeric DEFAULT 0,
  p_min_stock_level numeric DEFAULT NULL,
  p_barcode text DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_bid uuid; v_id uuid; v_min numeric;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'INVALID_NAME'; end if;
  if coalesce(p_initial_stock,0) < 0 then raise exception 'INVALID_QUANTITY'; end if;

  select coalesce(p_min_stock_level, default_min_stock) into v_min from public.businesses where id = v_bid;

  insert into public.products (business_id, name, unit, purchase_price, selling_price, current_stock,
                               min_stock_level, barcode, sku, category_id, supplier_id)
  values (v_bid, trim(p_name), coalesce(p_unit,'pcs'), coalesce(p_purchase_price,0), coalesce(p_selling_price,0), 0,
          coalesce(v_min,5), p_barcode, p_sku, p_category_id, p_supplier_id)
  returning id into v_id;

  if coalesce(p_initial_stock,0) > 0 then
    perform public.apply_movement(v_id, 'INITIAL_STOCK', p_initial_stock, null, null, 'Opening stock');
  end if;
  return v_id;
end; $function$;

-- The app may edit product details, but never the stock quantity directly
DROP POLICY IF EXISTS "prod update" ON public.products;
CREATE POLICY "prod update" ON public.products FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

CREATE OR REPLACE FUNCTION public.guard_direct_stock_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
begin
  if new.current_stock is distinct from old.current_stock
     and current_setting('role', true) <> 'service_role'
     and pg_trigger_depth() = 1
     and not exists (select 1 from public.inventory_movements m
                     where m.product_id = new.id and m.created_at > now() - interval '2 seconds')
  then
    raise exception 'DIRECT_STOCK_WRITE_NOT_ALLOWED';
  end if;
  return new;
end; $function$;

DROP TRIGGER IF EXISTS products_guard_stock ON public.products;

-- Harden: no anonymous callers, always require a signed-in member
CREATE OR REPLACE FUNCTION public.current_business_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select business_id from public.business_users where user_id = auth.uid() order by created_at limit 1
$function$;

CREATE OR REPLACE FUNCTION public.apply_movement(p_product_id uuid, p_type movement_type, p_qty numeric, p_sale_id uuid DEFAULT NULL::uuid, p_purchase_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_bid uuid; v_prev numeric; v_new numeric; v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  select current_stock, name into v_prev, v_name from public.products where id = p_product_id and business_id = v_bid for update;
  if v_prev is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  v_new := v_prev + p_qty;
  if v_new < 0 then raise exception 'INSUFFICIENT_STOCK|%|%|%', v_name, v_prev, abs(p_qty); end if;
  update public.products set current_stock = v_new where id = p_product_id;
  insert into public.inventory_movements (business_id, product_id, movement_type, quantity, previous_stock, new_stock, sale_id, purchase_id, note)
  values (v_bid, p_product_id, p_type, p_qty, v_prev, v_new, p_sale_id, p_purchase_id, p_note);
  return v_new;
end; $function$;

-- apply_movement is an internal primitive: only the wrapper functions may call it
REVOKE ALL ON FUNCTION public.apply_movement(uuid, movement_type, numeric, uuid, uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_demo_data() FROM public, anon;
REVOKE ALL ON FUNCTION public.create_product(text, text, numeric, numeric, numeric, numeric, text, text, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_product(text, text, numeric, numeric, numeric, numeric, text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;