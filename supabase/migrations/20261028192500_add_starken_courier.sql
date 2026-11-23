alter table public.packages
  drop constraint if exists packages_courier_check;

alter table public.packages
  add constraint packages_courier_check
  check (courier in ('blue-express', 'chilexpress', 'correos-chile', '17track', 'starken'));
