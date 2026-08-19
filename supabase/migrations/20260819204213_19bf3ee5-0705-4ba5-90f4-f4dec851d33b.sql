revoke execute on function
  public.setup_business(text,text,text),
  public.create_sale(jsonb, public.payment_method, text, text),
  public.create_purchase(jsonb, uuid, text, date, text, text),
  public.adjust_stock(uuid, numeric, text),
  public.dashboard_summary(),
  public.current_business_id(),
  public.current_role_in_business(),
  public.has_business_role(public.app_role[]),
  public.apply_movement(uuid, public.movement_type, numeric, uuid, uuid, text),
  public.handle_new_user(),
  public.set_updated_at()
from public, anon;

revoke execute on function public.apply_movement(uuid, public.movement_type, numeric, uuid, uuid, text) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
