-- ENUMS
create type public.app_role as enum ('owner','manager','salesperson');
create type public.movement_type as enum ('PURCHASE','SALE','ADJUSTMENT','RETURN','INITIAL_STOCK');
create type public.payment_method as enum ('CASH','MOBILE_MONEY','BANK','OTHER');

-- UPDATED AT
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- BUSINESSES
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  currency text not null default 'RWF',
  default_min_stock integer not null default 5,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  language text not null default 'rw',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null default 'salesperson',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index on public.business_users(user_id);

-- HELPERS
create or replace function public.current_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.business_users where user_id = auth.uid() order by created_at limit 1
$$;

create or replace function public.current_role_in_business() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.business_users where user_id = auth.uid() order by created_at limit 1
$$;

create or replace function public.has_business_role(_roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_users where user_id = auth.uid() and role = any(_roles))
$$;

-- CATEGORIES
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on public.product_categories(business_id);

-- SUPPLIERS
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
create index on public.suppliers(business_id);

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  image_url text,
  sku text,
  barcode text,
  category_id uuid references public.product_categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  unit text not null default 'pcs',
  purchase_price numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  current_stock numeric(14,2) not null default 0,
  min_stock_level numeric(14,2) not null default 5,
  is_favorite boolean not null default false,
  is_active boolean not null default true,
  times_sold integer not null default 0,
  last_sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products(business_id);
create index on public.products(business_id, barcode);
create extension if not exists pg_trgm;
create index products_name_trgm_idx on public.products using gin (lower(name) gin_trgm_ops);
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- PURCHASES
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  purchase_date date not null default current_date,
  total_amount numeric(14,2) not null default 0,
  image_url text,
  source text not null default 'MANUAL',
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.purchases(business_id, purchase_date desc);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index on public.purchase_items(purchase_id);
create index on public.purchase_items(product_id);

-- SALES
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_method public.payment_method not null default 'CASH',
  total_amount numeric(14,2) not null default 0,
  customer_name text,
  source text not null default 'MANUAL',
  sold_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.sales(business_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index on public.sale_items(sale_id);
create index on public.sale_items(product_id);

-- MOVEMENTS
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type public.movement_type not null,
  quantity numeric(14,2) not null,
  previous_stock numeric(14,2) not null,
  new_stock numeric(14,2) not null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.inventory_movements(business_id, created_at desc);
create index on public.inventory_movements(product_id, created_at desc);

-- VOICE
create table public.voice_commands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  transcript text,
  language text,
  intent text,
  structured_action jsonb,
  status text not null default 'PENDING',
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index on public.voice_commands(business_id, created_at desc);

-- AUDIT
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid default auth.uid(),
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(business_id, created_at desc);

-- GRANTS
grant select, insert, update, delete on public.businesses, public.profiles, public.business_users,
  public.product_categories, public.suppliers, public.products, public.purchases, public.purchase_items,
  public.sales, public.sale_items, public.inventory_movements, public.voice_commands, public.audit_logs
  to authenticated;
grant all on public.businesses, public.profiles, public.business_users,
  public.product_categories, public.suppliers, public.products, public.purchases, public.purchase_items,
  public.sales, public.sale_items, public.inventory_movements, public.voice_commands, public.audit_logs
  to service_role;

-- RLS
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_users enable row level security;
alter table public.product_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.voice_commands enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read business" on public.businesses for select to authenticated
  using (id = public.current_business_id());
create policy "create own business" on public.businesses for insert to authenticated
  with check (created_by = auth.uid());
create policy "owner updates business" on public.businesses for update to authenticated
  using (id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (id = public.current_business_id());

create policy "read members" on public.business_users for select to authenticated
  using (business_id = public.current_business_id() or user_id = auth.uid());
create policy "join own business" on public.business_users for insert to authenticated
  with check (user_id = auth.uid() or (business_id = public.current_business_id() and public.has_business_role(array['owner']::public.app_role[])));
create policy "owner manages members" on public.business_users for update to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner']::public.app_role[]))
  with check (business_id = public.current_business_id());
create policy "owner removes members" on public.business_users for delete to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner']::public.app_role[]));

-- generic business-scoped policies
create policy "cat read" on public.product_categories for select to authenticated using (business_id = public.current_business_id());
create policy "cat write" on public.product_categories for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "sup read" on public.suppliers for select to authenticated using (business_id = public.current_business_id());
create policy "sup write" on public.suppliers for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "prod read" on public.products for select to authenticated using (business_id = public.current_business_id());
create policy "prod insert" on public.products for insert to authenticated with check (business_id = public.current_business_id());
create policy "prod update" on public.products for update to authenticated
  using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "prod delete" on public.products for delete to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "pur read" on public.purchases for select to authenticated using (business_id = public.current_business_id());
create policy "pur write" on public.purchases for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "puri read" on public.purchase_items for select to authenticated using (business_id = public.current_business_id());
create policy "puri write" on public.purchase_items for all to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]))
  with check (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "sal read" on public.sales for select to authenticated using (business_id = public.current_business_id());
create policy "sal insert" on public.sales for insert to authenticated with check (business_id = public.current_business_id());
create policy "sal delete" on public.sales for delete to authenticated
  using (business_id = public.current_business_id() and public.has_business_role(array['owner','manager']::public.app_role[]));

create policy "sali read" on public.sale_items for select to authenticated using (business_id = public.current_business_id());
create policy "sali insert" on public.sale_items for insert to authenticated with check (business_id = public.current_business_id());

create policy "mov read" on public.inventory_movements for select to authenticated using (business_id = public.current_business_id());
create policy "mov insert" on public.inventory_movements for insert to authenticated with check (business_id = public.current_business_id());

create policy "voice read" on public.voice_commands for select to authenticated using (business_id = public.current_business_id());
create policy "voice write" on public.voice_commands for all to authenticated
  using (business_id = public.current_business_id() and user_id = auth.uid())
  with check (business_id = public.current_business_id() and user_id = auth.uid());

create policy "audit read" on public.audit_logs for select to authenticated using (business_id = public.current_business_id());
create policy "audit insert" on public.audit_logs for insert to authenticated with check (business_id = public.current_business_id());

-- PROFILE TRIGGER
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- BUSINESS SETUP
create or replace function public.setup_business(p_name text, p_phone text default null, p_address text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_existing uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select business_id into v_existing from public.business_users where user_id = auth.uid() limit 1;
  if v_existing is not null then return v_existing; end if;
  insert into public.businesses (name, phone, address, created_by) values (p_name, p_phone, p_address, auth.uid()) returning id into v_id;
  insert into public.business_users (business_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end; $$;

-- STOCK ENGINE
create or replace function public.apply_movement(p_product_id uuid, p_type public.movement_type, p_qty numeric,
  p_sale_id uuid default null, p_purchase_id uuid default null, p_note text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_prev numeric; v_new numeric;
begin
  v_bid := public.current_business_id();
  select current_stock into v_prev from public.products where id = p_product_id and business_id = v_bid for update;
  if v_prev is null then raise exception 'Product not found'; end if;
  v_new := v_prev + p_qty;
  if v_new < 0 then raise exception 'INSUFFICIENT_STOCK'; end if;
  update public.products set current_stock = v_new where id = p_product_id;
  insert into public.inventory_movements (business_id, product_id, movement_type, quantity, previous_stock, new_stock, sale_id, purchase_id, note)
  values (v_bid, p_product_id, p_type, p_qty, v_prev, v_new, p_sale_id, p_purchase_id, p_note);
  return v_new;
end; $$;

-- CREATE SALE
create or replace function public.create_sale(p_items jsonb, p_payment_method public.payment_method default 'CASH',
  p_customer_name text default null, p_source text default 'MANUAL')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_sale uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'No business'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Empty cart'; end if;
  insert into public.sales (business_id, payment_method, customer_name, source) values (v_bid, p_payment_method, p_customer_name, p_source) returning id into v_sale;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := coalesce((v_item->>'unit_price')::numeric, (select selling_price from public.products where id = v_pid));
    if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    insert into public.sale_items (business_id, sale_id, product_id, quantity, unit_price, total)
    values (v_bid, v_sale, v_pid, v_qty, v_price, v_qty * v_price);
    perform public.apply_movement(v_pid, 'SALE', -v_qty, v_sale, null, null);
    update public.products set times_sold = times_sold + 1, last_sold_at = now() where id = v_pid;
    v_total := v_total + v_qty * v_price;
  end loop;
  update public.sales set total_amount = v_total where id = v_sale;
  insert into public.audit_logs (business_id, action, entity, entity_id, details) values (v_bid, 'CREATE_SALE', 'sales', v_sale, jsonb_build_object('total', v_total));
  return v_sale;
end; $$;

-- CREATE PURCHASE
create or replace function public.create_purchase(p_items jsonb, p_supplier_id uuid default null, p_invoice_number text default null,
  p_purchase_date date default current_date, p_image_url text default null, p_source text default 'MANUAL')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_bid uuid; v_pur uuid; v_item jsonb; v_total numeric := 0; v_pid uuid; v_qty numeric; v_price numeric;
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'No business'; end if;
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  insert into public.purchases (business_id, supplier_id, invoice_number, purchase_date, image_url, source)
  values (v_bid, p_supplier_id, p_invoice_number, p_purchase_date, p_image_url, p_source) returning id into v_pur;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    insert into public.purchase_items (business_id, purchase_id, product_id, quantity, unit_price, total)
    values (v_bid, v_pur, v_pid, v_qty, v_price, v_qty * v_price);
    perform public.apply_movement(v_pid, 'PURCHASE', v_qty, null, v_pur, null);
    if v_price > 0 then update public.products set purchase_price = v_price where id = v_pid; end if;
    v_total := v_total + v_qty * v_price;
  end loop;
  update public.purchases set total_amount = v_total where id = v_pur;
  insert into public.audit_logs (business_id, action, entity, entity_id, details) values (v_bid, 'CREATE_PURCHASE', 'purchases', v_pur, jsonb_build_object('total', v_total));
  return v_pur;
end; $$;

-- ADJUST STOCK
create or replace function public.adjust_stock(p_product_id uuid, p_new_stock numeric, p_note text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_prev numeric;
begin
  if not public.has_business_role(array['owner','manager']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select current_stock into v_prev from public.products where id = p_product_id and business_id = public.current_business_id();
  if v_prev is null then raise exception 'Product not found'; end if;
  return public.apply_movement(p_product_id, 'ADJUSTMENT', p_new_stock - v_prev, null, null, p_note);
end; $$;

-- DASHBOARD SUMMARY
create or replace function public.dashboard_summary()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'today_sales', (select coalesce(sum(total_amount),0) from public.sales where business_id = public.current_business_id() and created_at >= date_trunc('day', now())),
    'today_sales_count', (select count(*) from public.sales where business_id = public.current_business_id() and created_at >= date_trunc('day', now())),
    'today_purchases', (select coalesce(sum(total_amount),0) from public.purchases where business_id = public.current_business_id() and purchase_date = current_date),
    'stock_value', (select coalesce(sum(current_stock * purchase_price),0) from public.products where business_id = public.current_business_id() and is_active),
    'product_count', (select count(*) from public.products where business_id = public.current_business_id() and is_active),
    'low_stock', (select count(*) from public.products where business_id = public.current_business_id() and is_active and current_stock > 0 and current_stock <= min_stock_level),
    'out_of_stock', (select count(*) from public.products where business_id = public.current_business_id() and is_active and current_stock <= 0)
  )
$$;

grant execute on function public.setup_business(text,text,text), public.create_sale(jsonb, public.payment_method, text, text),
  public.create_purchase(jsonb, uuid, text, date, text, text), public.adjust_stock(uuid, numeric, text),
  public.dashboard_summary(), public.current_business_id(), public.current_role_in_business(),
  public.has_business_role(public.app_role[]), public.apply_movement(uuid, public.movement_type, numeric, uuid, uuid, text) to authenticated;
