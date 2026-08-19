create or replace function public.seed_demo_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bid uuid; v_cat_id uuid; v_sup_id uuid; v_prod_id uuid; v_pur uuid; v_sale uuid;
  v_rows text[] := array[
    'Sima (Cimerwa 50kg)|Ubwubatsi|mfuka|11500|13000|60|10',
    'Sima (Prime 50kg)|Ubwubatsi|mfuka|11000|12500|40|10',
    'Umusenyi|Ubwubatsi|toni|18000|22000|12|3',
    'Amabuye|Ubwubatsi|toni|20000|25000|8|2',
    'Amatafari|Ubwubatsi|pcs|150|220|900|200',
    'Ibyuma bya 8mm|Ubwubatsi|pcs|4500|5500|120|20',
    'Ibyuma bya 12mm|Ubwubatsi|pcs|8500|10000|80|20',
    'Imisumari 2 inch|Ubwubatsi|kg|1500|2000|60|10',
    'Imisumari 3 inch|Ubwubatsi|kg|1500|2000|55|10',
    'Imisumari 4 inch|Ubwubatsi|kg|1600|2100|40|10',
    'Amabati (Ibiro 30)|Ubwubatsi|pcs|9500|11500|70|10',
    'Amabati (Ibiro 28)|Ubwubatsi|pcs|11000|13500|45|10',
    'Ibiti by''inzu|Ubwubatsi|pcs|3500|4500|100|20',
    'Irangi ryera 20L|Irangi|pcs|38000|45000|10|2',
    'Irangi ry''ubururu 20L|Irangi|pcs|39000|46000|6|2',
    'Irangi ry''icyatsi 4L|Irangi|pcs|9500|12000|14|3',
    'Irangi ry''umutuku 4L|Irangi|pcs|9500|12000|9|3',
    'Ipinceau nini|Irangi|pcs|2500|3500|25|5',
    'Ipinceau nto|Irangi|pcs|1200|1800|30|5',
    'Rolo y''irangi|Irangi|pcs|3000|4200|18|5',
    'Terebentine 1L|Irangi|pcs|2800|3800|20|5',
    'Sable papier|Irangi|pcs|500|800|60|10',
    'Insinga 1.5mm (roll)|Amashanyarazi|roll|28000|34000|8|2',
    'Insinga 2.5mm (roll)|Amashanyarazi|roll|42000|50000|6|2',
    'Ampoule LED 9W|Amashanyarazi|pcs|1500|2500|80|15',
    'Ampoule LED 12W|Amashanyarazi|pcs|2000|3000|60|15',
    'Douille|Amashanyarazi|pcs|700|1200|90|20',
    'Interrupteur|Amashanyarazi|pcs|1200|2000|70|15',
    'Prise|Amashanyarazi|pcs|1500|2500|65|15',
    'Disjoncteur 16A|Amashanyarazi|pcs|4500|6500|20|5',
    'Tableau electrique|Amashanyarazi|pcs|12000|16000|6|2',
    'Bateri AA (paki)|Amashanyarazi|pcs|800|1300|100|20',
    'Bateri AAA (paki)|Amashanyarazi|pcs|800|1300|90|20',
    'Torch nto|Amashanyarazi|pcs|2500|4000|25|5',
    'Adaptateur|Amashanyarazi|pcs|1800|3000|30|5',
    'Isukari 1kg|Ibiribwa|kg|1300|1600|120|20',
    'Isukari 5kg|Ibiribwa|pcs|6300|7500|30|5',
    'Umuceri Pakistan 1kg|Ibiribwa|kg|1600|2000|150|25',
    'Umuceri wa Tanzania 1kg|Ibiribwa|kg|1400|1800|140|25',
    'Ifu y''ibigori 1kg|Ibiribwa|kg|900|1200|100|20',
    'Ifu y''ingano 1kg|Ibiribwa|kg|1200|1500|90|20',
    'Ibishyimbo 1kg|Ibiribwa|kg|1100|1500|130|20',
    'Amashaza 1kg|Ibiribwa|kg|1300|1700|60|10',
    'Ubunyobwa 1kg|Ibiribwa|kg|2500|3200|40|10',
    'Amavuta yo guteka 1L|Ibiribwa|pcs|2200|2800|80|15',
    'Amavuta yo guteka 5L|Ibiribwa|pcs|10500|12500|20|5',
    'Umunyu 1kg|Ibiribwa|kg|400|600|100|20',
    'Icyayi (paki)|Ibiribwa|pcs|900|1400|70|15',
    'Ikawa (paki)|Ibiribwa|pcs|2500|3500|35|10',
    'Amata y''ifu 400g|Ibiribwa|pcs|4500|5500|25|5',
    'Blueband 250g|Ibiribwa|pcs|2200|2900|30|5',
    'Spaghetti 500g|Ibiribwa|pcs|1100|1500|60|10',
    'Macaroni 500g|Ibiribwa|pcs|1100|1500|55|10',
    'Tomato paste|Ibiribwa|pcs|600|1000|80|15',
    'Coca Cola 50cl|Ibinyobwa|pcs|500|700|200|30',
    'Coca Cola 30cl|Ibinyobwa|pcs|350|500|180|30',
    'Fanta Orange 50cl|Ibinyobwa|pcs|500|700|160|30',
    'Fanta Citron 50cl|Ibinyobwa|pcs|500|700|140|30',
    'Sprite 50cl|Ibinyobwa|pcs|500|700|120|30',
    'Amazi Inyange 1.5L|Ibinyobwa|pcs|500|800|200|40',
    'Amazi Inyange 50cl|Ibinyobwa|pcs|250|400|240|40',
    'Amazi Jibu 1.5L|Ibinyobwa|pcs|450|700|150|30',
    'Juice Inyange 1L|Ibinyobwa|pcs|1200|1600|60|10',
    'Amata Inyange 1L|Ibinyobwa|pcs|1000|1300|50|10',
    'Energy drink|Ibinyobwa|pcs|1000|1500|40|10',
    'Primus 65cl|Ibinyobwa|pcs|900|1300|96|24',
    'Mutzig 65cl|Ibinyobwa|pcs|1100|1500|72|24',
    'Skol 65cl|Ibinyobwa|pcs|900|1300|60|24',
    'Isabune Panga|Isuku|pcs|700|1000|120|20',
    'Isabune Nomi|Isuku|pcs|750|1100|100|20',
    'Isabune y''intoki|Isuku|pcs|1200|1800|60|10',
    'Omo 500g|Isuku|pcs|1800|2400|70|15',
    'Omo 1kg|Isuku|pcs|3400|4300|40|10',
    'Javel 1L|Isuku|pcs|1200|1800|50|10',
    'Papier hygienique|Isuku|pcs|400|700|150|30',
    'Colgate 100ml|Isuku|pcs|1200|1800|60|10',
    'Brosse y''amenyo|Isuku|pcs|600|1000|70|15',
    'Vaseline 100ml|Isuku|pcs|1500|2200|45|10',
    'Shampoo 200ml|Isuku|pcs|2200|3000|30|5',
    'Detergent liquide 1L|Isuku|pcs|2000|2800|35|5',
    'Eponge|Isuku|pcs|300|600|80|15',
    'Balai|Isuku|pcs|1500|2500|25|5',
    'Seau 20L|Ibikoresho|pcs|2500|3800|30|5',
    'Bassin nini|Ibikoresho|pcs|3500|5000|20|5',
    'Ikirahuri (paki 6)|Ibikoresho|pcs|4000|6000|15|3',
    'Amasahani (paki 6)|Ibikoresho|pcs|5000|7500|12|3',
    'Amakoro (paki)|Ibikoresho|pcs|2000|3200|20|5',
    'Isafuriya nini|Ibikoresho|pcs|8000|11000|10|2',
    'Isafuriya nto|Ibikoresho|pcs|4500|6500|14|3',
    'Icyuma cyo guteka|Ibikoresho|pcs|1500|2500|20|5',
    'Ikaramu (paki)|Ibindi|pcs|1500|2500|40|10',
    'Ikayi 96p|Ibindi|pcs|500|800|120|20',
    'Ikayi 200p|Ibindi|pcs|900|1400|80|20',
    'Biscuits (paki)|Ibiribwa|pcs|300|500|200|40',
    'Chewing gum|Ibiribwa|pcs|100|200|300|50',
    'Bombo (paki)|Ibiribwa|pcs|1000|1600|60|10',
    'Allumettes (paki)|Ibindi|pcs|300|500|100|20',
    'Bougie (paki)|Ibindi|pcs|800|1300|50|10',
    'Umugozi (metero)|Ibindi|m|300|500|200|30',
    'Cadenas|Ibindi|pcs|2500|4000|20|5',
    'Marto|Ibikoresho|pcs|4000|6000|15|3',
    'Tournevis|Ibikoresho|pcs|1500|2500|25|5',
    'Metre|Ibikoresho|pcs|2000|3200|18|5'
  ];
  v_row text; v_parts text[]; v_i int := 0; v_n int; v_days int; v_qty numeric; v_items jsonb; v_created int := 0;
  v_supnames text[] := array['ABC Ltd','Kigali Wholesale','Nyabugogo Distributors','Inyange Distributor','Rwanda Hardware Supply'];
begin
  v_bid := public.current_business_id();
  if v_bid is null then raise exception 'No business'; end if;
  if (select count(*) from public.products where business_id = v_bid) > 0 then
    return jsonb_build_object('skipped', true, 'reason', 'Products already exist');
  end if;

  foreach v_row in array v_supnames loop
    insert into public.suppliers (business_id, name, phone) values (v_bid, v_row, '+25078' || lpad((floor(random()*10000000))::text, 7, '0'));
  end loop;

  foreach v_row in array v_rows loop
    v_parts := string_to_array(v_row, '|');
    select id into v_cat_id from public.product_categories where business_id = v_bid and name = v_parts[2];
    if v_cat_id is null then
      insert into public.product_categories (business_id, name) values (v_bid, v_parts[2]) returning id into v_cat_id;
    end if;
    select id into v_sup_id from public.suppliers where business_id = v_bid order by random() limit 1;
    insert into public.products (business_id, name, sku, barcode, category_id, supplier_id, unit,
      purchase_price, selling_price, current_stock, min_stock_level)
    values (v_bid, v_parts[1], 'DS-' || lpad((v_i+1)::text, 4, '0'),
      '69' || lpad((100000000 + v_i * 7919)::text, 11, '0'),
      v_cat_id, v_sup_id, v_parts[3],
      v_parts[4]::numeric, v_parts[5]::numeric, v_parts[6]::numeric, v_parts[7]::numeric)
    returning id into v_prod_id;
    insert into public.inventory_movements (business_id, product_id, movement_type, quantity, previous_stock, new_stock, note)
    values (v_bid, v_prod_id, 'INITIAL_STOCK', v_parts[6]::numeric, 0, v_parts[6]::numeric, 'Demo data');
    v_i := v_i + 1;
    v_created := v_created + 1;
  end loop;

  -- make a few products low / out of stock for the alerts demo
  update public.products set current_stock = 2 where business_id = v_bid and name like 'Sima (Prime%';
  update public.products set current_stock = 0 where business_id = v_bid and name = 'Marto';
  update public.products set current_stock = 3 where business_id = v_bid and name = 'Irangi ry''umutuku 4L';
  update public.products set is_favorite = true where business_id = v_bid and name in
    ('Coca Cola 50cl','Amazi Inyange 1.5L','Isukari 1kg','Sima (Cimerwa 50kg)','Isabune Panga','Umuceri Pakistan 1kg');

  -- sample purchases (last 30 days)
  for v_n in 1..8 loop
    v_days := floor(random()*30)::int;
    select id into v_sup_id from public.suppliers where business_id = v_bid order by random() limit 1;
    insert into public.purchases (business_id, supplier_id, invoice_number, purchase_date, source)
    values (v_bid, v_sup_id, 'INV-' || (1000 + v_n)::text, current_date - v_days, 'DEMO') returning id into v_pur;
    insert into public.purchase_items (business_id, purchase_id, product_id, quantity, unit_price, total)
    select v_bid, v_pur, p.id, q.qty, p.purchase_price, q.qty * p.purchase_price
    from (select id, purchase_price from public.products where business_id = v_bid order by random() limit 4) p
    cross join lateral (select (5 + floor(random()*20))::numeric as qty) q;
    update public.purchases set total_amount = (select coalesce(sum(total),0) from public.purchase_items where purchase_id = v_pur) where id = v_pur;
  end loop;

  -- sample sales (last 30 days)
  for v_n in 1..60 loop
    v_days := floor(random()*30)::int;
    insert into public.sales (business_id, payment_method, source, created_at)
    values (v_bid, (array['CASH','MOBILE_MONEY','BANK','OTHER']::public.payment_method[])[1 + floor(random()*3)::int], 'DEMO',
      now() - (v_days || ' days')::interval - (floor(random()*10) || ' hours')::interval)
    returning id into v_sale;
    insert into public.sale_items (business_id, sale_id, product_id, quantity, unit_price, total)
    select v_bid, v_sale, p.id, q.qty, p.selling_price, q.qty * p.selling_price
    from (select id, selling_price from public.products where business_id = v_bid order by random() limit (1 + floor(random()*3))::int) p
    cross join lateral (select (1 + floor(random()*5))::numeric as qty) q;
    update public.sales set total_amount = (select coalesce(sum(total),0) from public.sale_items where sale_id = v_sale) where id = v_sale;
    update public.products p set times_sold = p.times_sold + 1, last_sold_at = now()
      from public.sale_items si where si.sale_id = v_sale and si.product_id = p.id;
  end loop;

  return jsonb_build_object('products', v_created, 'ok', true);
end; $$;

revoke execute on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;
