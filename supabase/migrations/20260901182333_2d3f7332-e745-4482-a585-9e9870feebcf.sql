
-- ============ businesses: trial / access / employee mode ============
alter table public.businesses
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '5 days'),
  add column if not exists subscription_status text not null default 'TRIAL',
  add column if not exists employee_mode boolean not null default false;

do $$ begin
  alter table public.businesses add constraint businesses_subscription_status_chk
    check (subscription_status in ('TRIAL','ACTIVE','EXPIRED','SUSPENDED'));
exception when duplicate_object then null; end $$;

update public.businesses set trial_started_at = now(), trial_ends_at = now() + interval '5 days'
where subscription_status = 'TRIAL';

-- ============ sales: collected money vs credit ============
alter table public.sales
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists payment_status text not null default 'PAID';

do $$ begin
  alter table public.sales add constraint sales_payment_status_chk
    check (payment_status in ('PAID','PARTIAL','CREDIT'));
exception when duplicate_object then null; end $$;

update public.sales set amount_paid = total_amount where amount_paid = 0 and payment_status = 'PAID';

-- ============ expenses ============
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  category text not null default 'OTHER',
  expense_date date not null default current_date,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "exp read" on public.expenses for select to authenticated
  using (business_id = public.current_business_id());
create policy "exp write" on public.expenses for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));
create trigger expenses_updated before update on public.expenses
  for each row execute function public.set_updated_at();
create index if not exists expenses_business_date_idx on public.expenses (business_id, expense_date desc);

-- ============ debts ============
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  customer_name text not null,
  phone text,
  amount numeric not null check (amount > 0),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  due_date date,
  status text not null default 'OPEN' check (status in ('OPEN','PARTIAL','PAID')),
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.debts to authenticated;
grant all on public.debts to service_role;
alter table public.debts enable row level security;
create policy "debt read" on public.debts for select to authenticated
  using (business_id = public.current_business_id());
create policy "debt write" on public.debts for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));
create trigger debts_updated before update on public.debts
  for each row execute function public.set_updated_at();
create index if not exists debts_business_status_idx on public.debts (business_id, status);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method public.payment_method not null default 'CASH',
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert on public.debt_payments to authenticated;
grant all on public.debt_payments to service_role;
alter table public.debt_payments enable row level security;
create policy "debtpay read" on public.debt_payments for select to authenticated
  using (business_id = public.current_business_id());
create policy "debtpay insert" on public.debt_payments for insert to authenticated
  with check (business_id = public.current_business_id());

-- ============ analyst chat history ============
create table if not exists public.analyst_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.analyst_messages to authenticated;
grant all on public.analyst_messages to service_role;
alter table public.analyst_messages enable row level security;
create policy "analyst read" on public.analyst_messages for select to authenticated
  using (business_id = public.current_business_id() and user_id = auth.uid());
create policy "analyst write" on public.analyst_messages for all to authenticated
  using (business_id = public.current_business_id() and user_id = auth.uid())
  with check (business_id = public.current_business_id() and user_id = auth.uid());

-- ============ platform admin ============
create table if not exists public.platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;
alter table public.platform_admins enable row level security;
create policy "admin sees self" on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  owner_email text,
  owner_phone text,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "settings read" on public.platform_settings for select to authenticated using (true);
create policy "settings admin write" on public.platform_settings for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ============ access gate ============
create or replace function public.business_access_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b
    where b.id = public.current_business_id()
      and (b.subscription_status = 'ACTIVE'
        or (b.subscription_status = 'TRIAL' and b.trial_ends_at > now()))
  )
$$;

create or replace function public.business_access_state()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'business_id', b.id,
      'name', b.name,
      'status', case when b.subscription_status = 'TRIAL' and b.trial_ends_at <= now() then 'EXPIRED' else b.subscription_status end,
      'trial_ends_at', b.trial_ends_at,
      'days_left', greatest(0, ceil(extract(epoch from (b.trial_ends_at - now())) / 86400)),
      'employee_mode', b.employee_mode,
      'access_ok', (b.subscription_status = 'ACTIVE' or (b.subscription_status = 'TRIAL' and b.trial_ends_at > now())),
      'owner_email', (select owner_email from public.platform_settings limit 1),
      'owner_phone', (select owner_phone from public.platform_settings limit 1),
      'is_platform_admin', public.is_platform_admin()
    ) from public.businesses b where b.id = public.current_business_id()
  ), jsonb_build_object('status','NONE','access_ok',false,'is_platform_admin', public.is_platform_admin()));
$$;

-- ============ stock/write functions honour the access gate ============
create or replace function public.apply_movement(p_product_id uuid, p_type movement_type, p_qty numeric, p_sale_id uuid default null, p_purchase_id uuid default null, p_note text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_prev numeric; v_new numeric; v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.business_access_ok() then raise exception 'ACCESS_EXPIRED'; end if;
  select current_stock, name into v_prev, v_name from public.products where id = p_product_id and business_id = v_bid for update;
  if v_prev is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  v_new := v_prev + p_qty;
  if v_new < 0 then raise exception 'INSUFFICIENT_STOCK|%|%|%', v_name, v_prev, abs(p_qty); end if;
  update public.products set current_stock = v_new where id = p_product_id;
  insert into public.inventory_movements (business_id, product_id, movement_type, quantity, previous_stock, new_stock, sale_id, purchase_id, note)
  values (v_bid, p_product_id, p_type, p_qty, v_prev, v_new, p_sale_id, p_purchase_id, p_note);
  return v_new;
end; $$;

drop function if exists public.create_sale(jsonb, payment_method, text, text, text);

create or replace function public.create_sale(
  p_items jsonb,
  p_payment_method payment_method default 'CASH',
  p_customer_name text default null,
  p_source text default 'MANUAL',
  p_client_token text default null,
  p_payment_status text default 'PAID',
  p_amount_paid numeric default null,
  p_debtor_name text default null,
  p_debtor_phone text default null,
  p_due_date date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_sale uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
        v_paid numeric; v_status text;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.business_access_ok() then raise exception 'ACCESS_EXPIRED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  v_status := coalesce(p_payment_status, 'PAID');
  if v_status not in ('PAID','PARTIAL','CREDIT') then raise exception 'INVALID_PAYMENT_STATUS'; end if;

  if p_client_token is not null then
    select id into v_sale from public.sales where business_id = v_bid and client_token = p_client_token;
    if v_sale is not null then return v_sale; end if;
  end if;

  insert into public.sales (business_id, payment_method, customer_name, source, client_token, payment_status, amount_paid)
  values (v_bid, p_payment_method, p_customer_name, p_source, p_client_token, v_status, 0) returning id into v_sale;

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

  if v_status = 'PAID' then v_paid := v_total;
  elsif v_status = 'CREDIT' then v_paid := 0;
  else v_paid := least(greatest(coalesce(p_amount_paid, 0), 0), v_total); end if;

  update public.sales set total_amount = v_total, amount_paid = v_paid where id = v_sale;

  if v_status in ('CREDIT','PARTIAL') and (v_total - v_paid) > 0 then
    insert into public.debts (business_id, sale_id, customer_name, phone, amount, due_date, created_by)
    values (v_bid, v_sale, coalesce(nullif(trim(coalesce(p_debtor_name, p_customer_name)), ''), 'Umukiriya'),
            p_debtor_phone, v_total - v_paid, p_due_date, auth.uid());
  end if;

  insert into public.audit_logs (business_id, action, entity, entity_id, details)
  values (v_bid, 'CREATE_SALE', 'sales', v_sale, jsonb_build_object('total', v_total, 'paid', v_paid, 'status', v_status));
  return v_sale;
end; $$;

create or replace function public.create_purchase(p_items jsonb, p_supplier_id uuid default null, p_invoice_number text default null, p_purchase_date date default current_date, p_image_url text default null, p_source text default 'MANUAL', p_notes text default null, p_client_token text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_pur uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.business_access_ok() then raise exception 'ACCESS_EXPIRED'; end if;
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
end; $$;

-- ============ expenses / debt RPCs ============
create or replace function public.record_expense(p_name text, p_amount numeric, p_category text default 'OTHER', p_date date default current_date, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_id uuid;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.business_access_ok() then raise exception 'ACCESS_EXPIRED'; end if;
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'INVALID_NAME'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;
  insert into public.expenses (business_id, name, amount, category, expense_date, note)
  values (v_bid, trim(p_name), p_amount, coalesce(p_category,'OTHER'), coalesce(p_date, current_date), p_note)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.record_debt_payment(p_debt_id uuid, p_amount numeric, p_method payment_method default 'CASH', p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_amount numeric; v_paid numeric; v_new numeric; v_status text;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'NO_BUSINESS'; end if;
  if not public.business_access_ok() then raise exception 'ACCESS_EXPIRED'; end if;
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select amount, amount_paid into v_amount, v_paid from public.debts where id = p_debt_id and business_id = v_bid for update;
  if v_amount is null then raise exception 'DEBT_NOT_FOUND'; end if;
  v_new := least(v_paid + p_amount, v_amount);
  v_status := case when v_new >= v_amount then 'PAID' when v_new > 0 then 'PARTIAL' else 'OPEN' end;
  insert into public.debt_payments (business_id, debt_id, amount, method, note)
  values (v_bid, p_debt_id, least(p_amount, v_amount - v_paid), p_method, p_note);
  update public.debts set amount_paid = v_new, status = v_status where id = p_debt_id;
  insert into public.audit_logs (business_id, action, entity, entity_id, details)
  values (v_bid, 'DEBT_PAYMENT', 'debts', p_debt_id, jsonb_build_object('amount', p_amount));
  return jsonb_build_object('amount_paid', v_new, 'status', v_status);
end; $$;

-- ============ reports ============
create or replace function public.business_report(p_period text default 'day')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_bid uuid; v_from timestamptz; v_prev_from timestamptz;
begin
  v_bid := public.current_business_id();
  if v_bid is null then return jsonb_build_object('error','NO_BUSINESS'); end if;
  v_from := case p_period when 'week' then now() - interval '7 days'
                          when 'month' then now() - interval '30 days'
                          else date_trunc('day', now()) end;
  v_prev_from := case p_period when 'week' then now() - interval '14 days'
                               when 'month' then now() - interval '60 days'
                               else date_trunc('day', now()) - interval '1 day' end;

  return jsonb_build_object(
    'period', coalesce(p_period,'day'),
    'from', v_from,
    'sales_total', (select coalesce(sum(total_amount),0) from public.sales where business_id = v_bid and created_at >= v_from),
    'collected', (select coalesce(sum(amount_paid),0) from public.sales where business_id = v_bid and created_at >= v_from)
                 + (select coalesce(sum(amount),0) from public.debt_payments where business_id = v_bid and created_at >= v_from),
    'credit', (select coalesce(sum(total_amount - amount_paid),0) from public.sales where business_id = v_bid and created_at >= v_from),
    'sales_count', (select count(*) from public.sales where business_id = v_bid and created_at >= v_from),
    'prev_sales_total', (select coalesce(sum(total_amount),0) from public.sales where business_id = v_bid and created_at >= v_prev_from and created_at < v_from),
    'purchases', (select coalesce(sum(total_amount),0) from public.purchases where business_id = v_bid and created_at >= v_from),
    'expenses', (select coalesce(sum(amount),0) from public.expenses where business_id = v_bid and created_at >= v_from),
    'expenses_by_category', (select coalesce(jsonb_agg(jsonb_build_object('category', category, 'amount', amt) order by amt desc), '[]'::jsonb)
       from (select category, sum(amount) as amt from public.expenses where business_id = v_bid and created_at >= v_from group by category) e),
    'gross_profit', (select coalesce(sum((si.unit_price - p.purchase_price) * si.quantity),0)
       from public.sale_items si join public.sales s on s.id = si.sale_id join public.products p on p.id = si.product_id
       where si.business_id = v_bid and s.created_at >= v_from),
    'top_products', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'qty', q, 'revenue', rev) order by rev desc), '[]'::jsonb)
       from (select p.name, sum(si.quantity) q, sum(si.total) rev
             from public.sale_items si join public.sales s on s.id = si.sale_id join public.products p on p.id = si.product_id
             where si.business_id = v_bid and s.created_at >= v_from group by p.name order by sum(si.total) desc limit 5) t),
    'outstanding_debt', (select coalesce(sum(amount - amount_paid),0) from public.debts where business_id = v_bid and status <> 'PAID'),
    'debtor_count', (select count(*) from public.debts where business_id = v_bid and status <> 'PAID'),
    'low_stock', (select count(*) from public.products where business_id = v_bid and is_active and current_stock > 0 and current_stock <= min_stock_level),
    'out_of_stock', (select count(*) from public.products where business_id = v_bid and is_active and current_stock <= 0),
    'dead_stock', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'stock', current_stock, 'tied_value', current_stock * purchase_price, 'last_sold_at', last_sold_at) order by current_stock * purchase_price desc), '[]'::jsonb)
       from (select name, current_stock, purchase_price, last_sold_at from public.products
             where business_id = v_bid and is_active and current_stock > 0
               and (last_sold_at is null or last_sold_at < now() - interval '30 days')
             order by current_stock * purchase_price desc limit 5) d)
  );
end; $$;

-- ============ platform admin RPCs ============
create or replace function public.admin_list_businesses(p_search text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id, 'name', b.name, 'phone', b.phone,
      'status', case when b.subscription_status = 'TRIAL' and b.trial_ends_at <= now() then 'EXPIRED' else b.subscription_status end,
      'raw_status', b.subscription_status,
      'trial_ends_at', b.trial_ends_at, 'created_at', b.created_at,
      'members', (select count(*) from public.business_users bu where bu.business_id = b.id)
    ) order by b.created_at desc)
    from public.businesses b
    where p_search is null or b.name ilike '%' || p_search || '%' or coalesce(b.phone,'') ilike '%' || p_search || '%'
  ), '[]'::jsonb);
end; $$;

create or replace function public.admin_set_access(p_business_id uuid, p_status text, p_extra_days integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('TRIAL','ACTIVE','EXPIRED','SUSPENDED') then raise exception 'INVALID_STATUS'; end if;
  update public.businesses set subscription_status = p_status,
    trial_ends_at = case when p_extra_days is not null then greatest(trial_ends_at, now()) + (p_extra_days || ' days')::interval else trial_ends_at end
  where id = p_business_id returning subscription_status into v_status;
  if v_status is null then raise exception 'BUSINESS_NOT_FOUND'; end if;
  return jsonb_build_object('status', v_status);
end; $$;

create or replace function public.admin_update_settings(p_owner_email text, p_owner_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  update public.platform_settings set owner_email = nullif(trim(p_owner_email),''), owner_phone = nullif(trim(p_owner_phone),''), updated_at = now() where id;
  return jsonb_build_object('ok', true);
end; $$;

-- ============ grants on functions: authenticated only ============
revoke all on function public.business_access_ok() from public, anon;
revoke all on function public.business_access_state() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.business_report(text) from public, anon;
revoke all on function public.record_expense(text, numeric, text, date, text) from public, anon;
revoke all on function public.record_debt_payment(uuid, numeric, payment_method, text) from public, anon;
revoke all on function public.admin_list_businesses(text) from public, anon;
revoke all on function public.admin_set_access(uuid, text, integer) from public, anon;
revoke all on function public.admin_update_settings(text, text) from public, anon;
revoke all on function public.create_sale(jsonb, payment_method, text, text, text, text, numeric, text, text, date) from public, anon;
revoke all on function public.create_purchase(jsonb, uuid, text, date, text, text, text, text) from public, anon;
revoke all on function public.apply_movement(uuid, movement_type, numeric, uuid, uuid, text) from public, anon;

grant execute on function public.business_access_ok() to authenticated;
grant execute on function public.business_access_state() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.business_report(text) to authenticated;
grant execute on function public.record_expense(text, numeric, text, date, text) to authenticated;
grant execute on function public.record_debt_payment(uuid, numeric, payment_method, text) to authenticated;
grant execute on function public.admin_list_businesses(text) to authenticated;
grant execute on function public.admin_set_access(uuid, text, integer) to authenticated;
grant execute on function public.admin_update_settings(text, text) to authenticated;
grant execute on function public.create_sale(jsonb, payment_method, text, text, text, text, numeric, text, text, date) to authenticated;
grant execute on function public.create_purchase(jsonb, uuid, text, date, text, text, text, text) to authenticated;
grant execute on function public.apply_movement(uuid, movement_type, numeric, uuid, uuid, text) to authenticated;
