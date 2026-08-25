alter table public.profiles
  add column if not exists advice_frequency text not null default 'daily',
  add column if not exists advice_seen_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_advice_frequency_check
    check (advice_frequency in ('daily','weekly','monthly','off'));
exception when duplicate_object then null; end $$;

create or replace function public.business_advisor()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
with bid as (select public.current_business_id() as id),
sales_window as (
  select
    coalesce(sum(total_amount) filter (where created_at >= now() - interval '7 days'), 0) as sales_7d,
    coalesce(sum(total_amount) filter (where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'), 0) as sales_prev_7d,
    coalesce(count(*) filter (where created_at >= now() - interval '7 days'), 0) as count_7d
  from public.sales where business_id = (select id from bid)
),
items as (
  select si.product_id, si.quantity, si.total, s.created_at,
         (si.unit_price - p.purchase_price) * si.quantity as gross_profit,
         p.name, p.unit, p.current_stock, p.min_stock_level
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.products p on p.id = si.product_id
  where si.business_id = (select id from bid)
),
profit as (
  select
    coalesce(sum(gross_profit) filter (where created_at >= now() - interval '30 days'), 0) as profit_30d,
    coalesce(sum(gross_profit) filter (where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'), 0) as profit_prev_30d,
    coalesce(sum(total) filter (where created_at >= now() - interval '30 days'), 0) as revenue_30d,
    coalesce(sum(total) filter (where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'), 0) as revenue_prev_30d
  from items
),
per_product as (
  select product_id, max(name) as name, max(unit) as unit,
         max(current_stock) as current_stock, max(min_stock_level) as min_stock_level,
         coalesce(sum(quantity) filter (where created_at >= now() - interval '7 days'), 0) as qty_7d,
         coalesce(sum(quantity) filter (where created_at >= now() - interval '30 days'), 0) as qty_30d,
         coalesce(sum(gross_profit) filter (where created_at >= now() - interval '30 days'), 0) as profit_30d,
         coalesce(sum(total) filter (where created_at >= now() - interval '30 days'), 0) as revenue_30d
  from items group by product_id
),
best_day as (
  select date_trunc('day', created_at)::date as day, sum(total_amount) as amount
  from public.sales
  where business_id = (select id from bid) and created_at >= now() - interval '30 days'
  group by 1 order by 2 desc limit 1
),
stale as (
  select p.id, p.name, p.unit, p.current_stock, p.purchase_price, p.last_sold_at,
         p.current_stock * p.purchase_price as tied_value
  from public.products p
  where p.business_id = (select id from bid) and p.is_active and p.current_stock > 0
    and (p.last_sold_at is null or p.last_sold_at < now() - interval '30 days')
  order by p.current_stock * p.purchase_price desc
  limit 5
),
critical as (
  select
    count(*) filter (where current_stock <= 0) as out_of_stock,
    count(*) filter (where current_stock > 0 and current_stock <= min_stock_level) as low_stock,
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'unit', unit, 'current_stock', current_stock, 'min_stock_level', min_stock_level))
      filter (where current_stock <= min_stock_level), '[]'::jsonb) as items
  from (
    select id, name, unit, current_stock, min_stock_level
    from public.products
    where business_id = (select id from bid) and is_active
    order by current_stock limit 200
  ) q
)
select jsonb_build_object(
  'generated_at', now(),
  'sales_7d', (select sales_7d from sales_window),
  'sales_prev_7d', (select sales_prev_7d from sales_window),
  'sales_count_7d', (select count_7d from sales_window),
  'profit_30d', (select profit_30d from profit),
  'profit_prev_30d', (select profit_prev_30d from profit),
  'revenue_30d', (select revenue_30d from profit),
  'revenue_prev_30d', (select revenue_prev_30d from profit),
  'best_day', (select case when day is null then null else jsonb_build_object('day', day, 'amount', amount) end from best_day),
  'best_seller', (select case when count(*) = 0 then null else
      (select jsonb_build_object('id', product_id, 'name', name, 'unit', unit, 'qty_7d', qty_7d, 'current_stock', current_stock)
       from per_product where qty_7d > 0 order by qty_7d desc limit 1) end from per_product),
  'top_profit', (select case when count(*) = 0 then null else
      (select jsonb_build_object('id', product_id, 'name', name, 'profit_30d', profit_30d, 'revenue_30d', revenue_30d)
       from per_product where profit_30d > 0 order by profit_30d desc limit 1) end from per_product),
  'profit_drop_driver', (select case when count(*) = 0 then null else
      (select jsonb_build_object('id', product_id, 'name', name, 'qty_30d', qty_30d, 'profit_30d', profit_30d)
       from per_product order by profit_30d asc limit 1) end from per_product),
  'restock', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', product_id, 'name', name, 'unit', unit, 'current_stock', current_stock, 'qty_7d', qty_7d,
        'days_left', case when qty_7d > 0 then round((current_stock / (qty_7d/7.0))::numeric, 1) else null end)
        order by (current_stock / nullif(qty_7d/7.0, 0))), '[]'::jsonb)
      from (select * from per_product where qty_7d > 0 and current_stock <= (qty_7d/7.0) * 7 order by (current_stock / nullif(qty_7d/7.0,0)) limit 5) r),
  'fast_movers', (select coalesce(jsonb_agg(jsonb_build_object('id', product_id, 'name', name, 'unit', unit, 'qty_7d', qty_7d, 'current_stock', current_stock) order by qty_7d desc), '[]'::jsonb)
      from (select * from per_product where qty_7d > 0 order by qty_7d desc limit 5) f),
  'stale', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'unit', unit, 'current_stock', current_stock, 'tied_value', tied_value, 'last_sold_at', last_sold_at)), '[]'::jsonb) from stale),
  'out_of_stock', (select out_of_stock from critical),
  'low_stock', (select low_stock from critical),
  'critical_items', (select items from critical)
)
$function$;

revoke all on function public.business_advisor() from public;
grant execute on function public.business_advisor() to authenticated;