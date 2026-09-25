begin;

update public.plans
set price_cents = 1990,
    updated_at = now()
where slug = 'pro';

commit;
