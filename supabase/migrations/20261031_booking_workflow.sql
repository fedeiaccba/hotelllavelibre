-- Apply in the SQL Editor for an existing installation. Does not reset data.
begin;

alter table public.recommendations add column if not exists provider_cost numeric default 0;
alter table public.recommendations add column if not exists receptionist_commission numeric default 0;
alter table public.recommendations add column if not exists system_commission numeric default 0;
alter table public.sales add column if not exists provider_amount numeric default 0;
alter table public.sales add column if not exists receptionist_commission numeric default 0;
alter table public.sales add column if not exists system_commission numeric default 0;

update public.recommendations
set receptionist_commission = commission,
    provider_cost = greatest(coalesce(price, 0) - commission, 0)
where coalesce(receptionist_commission, 0) = 0
  and coalesce(system_commission, 0) = 0 and coalesce(commission, 0) > 0;
update public.sales
set receptionist_commission = commission,
    provider_amount = greatest(coalesce(amount, 0) - commission, 0)
where coalesce(receptionist_commission, 0) = 0
  and coalesce(system_commission, 0) = 0 and coalesce(commission, 0) > 0;

alter table public.sales add column if not exists booking_code text;
alter table public.sales add column if not exists booking_status text;
alter table public.sales add column if not exists payment_method text;
alter table public.sales add column if not exists guest_contact text;
alter table public.sales add column if not exists service_date date;
alter table public.sales add column if not exists service_time time;
alter table public.sales add column if not exists end_date date;
alter table public.sales add column if not exists end_time time;
alter table public.sales add column if not exists pickup_location text;
alter table public.sales add column if not exists expires_at timestamptz;
alter table public.sales add column if not exists paid_at timestamptz;
alter table public.sales add column if not exists collected_by text;
create unique index if not exists sales_booking_code_uidx on public.sales (booking_code);

commit;
