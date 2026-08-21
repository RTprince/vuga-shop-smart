-- 1. new movement types
ALTER TYPE public.movement_type ADD VALUE IF NOT EXISTS 'RETURN_IN';
ALTER TYPE public.movement_type ADD VALUE IF NOT EXISTS 'RETURN_OUT';

-- 2. idempotency tokens
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_token text;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS client_token text;
CREATE UNIQUE INDEX IF NOT EXISTS sales_business_token_uidx ON public.sales (business_id, client_token) WHERE client_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_business_token_uidx ON public.purchases (business_id, client_token) WHERE client_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx ON public.inventory_movements (product_id, created_at DESC);

-- 3. central stock engine: richer errors
CREATE OR REPLACE FUNCTION public.apply_movement(p_product_id uuid, p_type movement_type, p_qty numeric, p_sale_id uuid DEFAULT NULL::uuid, p_purchase_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_bid uuid; v_prev numeric; v_new numeric; v_name text;
begin
  v_bid := public.current_business_id();
  select current_stock, name into v_prev, v_name from public.products where id = p_product_id and business_id = v_bid for update;
  if v_prev is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  v_new := v_prev + p_qty;
  if v_new < 0 then
    raise exception 'INSUFFICIENT_STOCK|%|%|%', v_name, v_prev, abs(p_qty);
  end if;
  update public.products set current_stock = v_new where id = p_product_id;
  insert into public.inventory_movements (business_id, product_id, movement_type, quantity, previous_stock, new_stock, sale_id, purchase_id, note)
  values (v_bid, p_product_id, p_type, p_qty, v_prev, v_new, p_sale_id, p_purchase_id, p_note);
  return v_new;
end; $function$;

-- 4. sales with idempotency + payment/customer
CREATE OR REPLACE FUNCTION public.create_sale(p_items jsonb, p_payment_method payment_method DEFAULT 'CASH'::payment_method, p_customer_name text DEFAULT NULL::text, p_source text DEFAULT 'MANUAL'::text, p_client_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_bid uuid; v_sale uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  if p_client_token is not null then
    select id into v_sale from public.sales where business_id = v_bid and client_token = p_client_token;
    if v_sale is not null then return v_sale; end if;
  end if;

  insert into public.sales (business_id, payment_method, customer_name, source, client_token)
  values (v_bid, p_payment_method, p_customer_name, p_source, p_client_token) returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := coalesce((v_item->>'unit_price')::numeric, (select selling_price from public.products where id = v_pid));
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    insert into public.sale_items (business_id, sale_id, product_id, quantity, unit_price, total)
    values (v_bid, v_sale, v_pid, v_qty, v_price, v_qty * v_price);
    perform public.apply_movement(v_pid, 'SALE', -v_qty, v_sale, null, null);
    update public.products set times_sold = times_sold + 1, last_sold_at = now() where id = v_pid;
    v_total := v_total + v_qty * v_price;
  end loop;

  update public.sales set total_amount = v_total where id = v_sale;
  insert into public.audit_logs (business_id, action, entity, entity_id, details)
  values (v_bid, 'CREATE_SALE', 'sales', v_sale, jsonb_build_object('total', v_total));
  return v_sale;
end; $function$;

-- 5. purchases with idempotency + notes
CREATE OR REPLACE FUNCTION public.create_purchase(p_items jsonb, p_supplier_id uuid DEFAULT NULL::uuid, p_invoice_number text DEFAULT NULL::text, p_purchase_date date DEFAULT CURRENT_DATE, p_image_url text DEFAULT NULL::text, p_source text DEFAULT 'MANUAL'::text, p_notes text DEFAULT NULL::text, p_client_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_bid uuid; v_pur uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  if p_client_token is not null then
    select id into v_pur from public.purchases where business_id = v_bid and client_token = p_client_token;
    if v_pur is not null then return v_pur; end if;
  end if;

  insert into public.purchases (business_id, supplier_id, invoice_number, purchase_date, image_url, source, notes, client_token)
  values (v_bid, p_supplier_id, p_invoice_number, coalesce(p_purchase_date, current_date), p_image_url, p_source, p_notes, p_client_token)
  returning id into v_pur;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    insert into public.purchase_items (business_id, purchase_id, product_id, quantity, unit_price, total)
    values (v_bid, v_pur, v_pid, v_qty, v_price, v_qty * v_price);
    perform public.apply_movement(v_pid, 'PURCHASE', v_qty, null, v_pur, null);
    if v_price > 0 then update public.products set purchase_price = v_price where id = v_pid; end if;
    v_total := v_total + v_qty * v_price;
  end loop;

  update public.purchases set total_amount = v_total where id = v_pur;
  insert into public.audit_logs (business_id, action, entity, entity_id, details)
  values (v_bid, 'CREATE_PURCHASE', 'purchases', v_pur, jsonb_build_object('total', v_total));
  return v_pur;
end; $function$;

-- 6. returns through the same engine
CREATE OR REPLACE FUNCTION public.record_return(p_product_id uuid, p_quantity numeric, p_direction text, p_note text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
  if p_direction = 'IN' then
    return public.apply_movement(p_product_id, 'RETURN_IN', p_quantity, null, null, p_note);
  else
    return public.apply_movement(p_product_id, 'RETURN_OUT', -p_quantity, null, null, p_note);
  end if;
end; $function$;

-- 7. insights from real data only
CREATE OR REPLACE FUNCTION public.inventory_insights()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with bid as (select public.current_business_id() as id),
sold as (
  select si.product_id,
         sum(si.quantity) filter (where s.created_at >= now() - interval '7 days') as qty_7d,
         sum(si.quantity) filter (where s.created_at >= now() - interval '30 days') as qty_30d,
         sum(si.total) filter (where s.created_at >= now() - interval '30 days') as revenue_30d
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where si.business_id = (select id from bid)
  group by si.product_id
),
prod as (
  select p.id, p.name, p.unit, p.current_stock, p.min_stock_level, p.last_sold_at,
         coalesce(sd.qty_7d,0) as qty_7d, coalesce(sd.qty_30d,0) as qty_30d, coalesce(sd.revenue_30d,0) as revenue_30d
  from public.products p left join sold sd on sd.product_id = p.id
  where p.business_id = (select id from bid) and p.is_active
)
select jsonb_build_object(
  'units_sold_7d', (select coalesce(sum(qty_7d),0) from prod),
  'revenue_30d', (select coalesce(sum(revenue_30d),0) from prod),
  'fast_movers', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'unit',unit,'qty_7d',qty_7d,'current_stock',current_stock) order by qty_7d desc),'[]'::jsonb)
                  from (select * from prod where qty_7d > 0 order by qty_7d desc limit 5) f),
  'running_out', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'unit',unit,'current_stock',current_stock,'qty_7d',qty_7d,'days_left', case when qty_7d > 0 then round((current_stock / (qty_7d/7.0))::numeric, 1) else null end) order by (current_stock / nullif(qty_7d/7.0,0))),'[]'::jsonb)
                  from (select * from prod where qty_7d > 0 and current_stock <= (qty_7d/7.0)*7 order by (current_stock / nullif(qty_7d/7.0,0)) limit 5) r),
  'stale', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'unit',unit,'current_stock',current_stock,'last_sold_at',last_sold_at)),'[]'::jsonb)
            from (select * from prod where qty_30d = 0 and current_stock > 0 order by current_stock desc limit 5) st)
)
$function$;

REVOKE ALL ON FUNCTION public.record_return(uuid, numeric, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.inventory_insights() FROM public, anon;
REVOKE ALL ON FUNCTION public.create_sale(jsonb, payment_method, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.create_purchase(jsonb, uuid, text, date, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_return(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb, payment_method, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase(jsonb, uuid, text, date, text, text, text, text) TO authenticated;