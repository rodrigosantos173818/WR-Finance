begin;

create type public.subscription_status as enum ('trialing','active','past_due','canceled','expired');
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_cents integer not null check(price_cents > 0),
  currency text not null default 'BRL' check(currency='BRL'),
  billing_interval text not null check(billing_interval='month'),
  trial_days integer not null check(trial_days=30),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.plans(name,slug,price_cents,billing_interval,trial_days)
values ('WR Finance Pro','pro',2990,'month',30);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'trialing',
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  payment_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  provider_terminal boolean not null default false,
  checkout_key uuid,
  checkout_expires_at timestamptz,
  checkout_session_id text,
  checkout_url text,
  sync_token uuid,
  sync_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(trial_ends_at = trial_started_at + interval '720 hours'),
  check((current_period_start is null and current_period_end is null) or
    (current_period_start is not null and current_period_end > current_period_start)),
  unique(payment_provider,provider_subscription_id),
  unique(payment_provider,provider_customer_id)
);
create table private.billing_trial_claims (
  -- Kept independently of organizations: deleting a company never resets eligibility.
  user_id uuid primary key,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  companies_created integer not null default 1
);
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,event_id)
);
create index billing_events_pending_idx on public.billing_events(created_at) where processed_at is null;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
create policy plans_read on public.plans for select to authenticated using(active);
create policy subscriptions_read on public.subscriptions for select to authenticated using(private.is_member(organization_id));
create policy events_read on public.billing_events for select to authenticated using(private.has_role(organization_id,array['owner']::public.member_role[]));
revoke all on public.plans,public.subscriptions,public.billing_events from public,anon,authenticated;
revoke all on private.billing_trial_claims from public,anon,authenticated;
grant select on public.plans to authenticated;
grant select(id,organization_id,plan_id,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,cancel_at_period_end,canceled_at,payment_provider,created_at,updated_at) on public.subscriptions to authenticated;
grant select(id,provider,event_id,event_type,organization_id,processed_at,created_at) on public.billing_events to authenticated;
create trigger touch_updated_at before update on public.plans for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.subscriptions for each row execute function private.touch_updated_at();

-- One consistent deployment instant for every existing company. No financial rows change.
insert into public.subscriptions(organization_id,plan_id,trial_started_at,trial_ends_at)
select o.id,p.id,now(),now()+interval '720 hours' from public.organizations o cross join public.plans p where p.slug='pro';
insert into private.billing_trial_claims(user_id,started_at,ends_at,companies_created)
select m.user_id,now(),now()+interval '720 hours',count(*)::integer
from public.organization_members m where m.role='owner' group by m.user_id;

create function private.initialize_subscription() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_start timestamptz=statement_timestamp(); v_end timestamptz=v_start+interval '720 hours'; v_user uuid=auth.uid();
begin
  if v_user is not null then
    insert into private.billing_trial_claims(user_id,started_at,ends_at)
    values(v_user,v_start,v_end)
    on conflict(user_id) do update set companies_created=private.billing_trial_claims.companies_created+1
      where private.billing_trial_claims.companies_created<10
    returning started_at,ends_at into v_start,v_end;
    if not found then raise exception 'COMPANY_LIMIT_REACHED' using errcode='P0001'; end if;
  end if;
  insert into public.subscriptions(organization_id,plan_id,trial_started_at,trial_ends_at)
  select new.id,id,v_start,v_end from public.plans where slug='pro';
  raise log 'billing trial_created organization=%',new.id;
  return new;
end; $$;
create trigger initialize_subscription after insert on public.organizations for each row execute function private.initialize_subscription();

-- This is the only entitlement predicate. Both the read RPC and write triggers call it.
create function private.subscription_can_write(p_status public.subscription_status,p_trial_end timestamptz,p_start timestamptz,p_end timestamptz,p_now timestamptz)
returns boolean language sql immutable set search_path='' as $$
  select coalesce((p_status='trialing' and p_now<p_trial_end) or
    (p_status in ('active','canceled') and p_start<=p_now and p_now<p_end),false);
$$;
create function private.company_can_write(p_org uuid) returns boolean
language sql volatile security definer set search_path='' as $$
  select coalesce((select private.subscription_can_write(status,trial_ends_at,current_period_start,current_period_end,statement_timestamp())
    from public.subscriptions where organization_id=p_org),false);
$$;
create function public.get_subscription_access(p_org uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.subscriptions; p public.plans; v_now timestamptz=statement_timestamp(); v_write boolean; v_status public.subscription_status; v_days integer;
begin
  if not private.is_member(p_org) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  select * into s from public.subscriptions where organization_id=p_org;
  if not found then raise exception 'BILLING_UNAVAILABLE' using errcode='P0001'; end if;
  select * into p from public.plans where id=s.plan_id;
  v_write=private.subscription_can_write(s.status,s.trial_ends_at,s.current_period_start,s.current_period_end,v_now);
  v_status=case when s.status in ('trialing','active') and not v_write then 'expired'::public.subscription_status else s.status end;
  v_days=greatest(0,least(30,ceil(extract(epoch from (s.trial_ends_at-v_now))/86400)::integer));
  return jsonb_build_object(
    'organizationId',p_org,'subscriptionId',s.id,'status',v_status,'canRead',true,'canWrite',v_write,'isReadOnly',not v_write,'available',true,
    'isTrial',v_status='trialing','isActive',v_status='active','isExpired',v_status='expired',
    'trialStartedAt',s.trial_started_at,'trialEndsAt',s.trial_ends_at,'daysRemaining',v_days,
    'trialCalendarDays',greatest(0,(s.trial_ends_at at time zone 'America/Sao_Paulo')::date-(v_now at time zone 'America/Sao_Paulo')::date),
    'currentPeriodStart',s.current_period_start,'currentPeriodEnd',s.current_period_end,
    'cancelAtPeriodEnd',s.cancel_at_period_end,'canceledAt',s.canceled_at,'createdAt',s.created_at,'serverNow',v_now,
    'hasProviderSubscription',s.provider_subscription_id is not null,'canManage',private.has_role(p_org,array['owner']::public.member_role[]),
    'plan',jsonb_build_object('slug',p.slug,'name',p.name,'priceCents',p.price_cents,'currency',p.currency,'interval',p.billing_interval,'trialDays',p.trial_days));
end; $$;

create function private.enforce_subscription_write() returns trigger
language plpgsql set search_path='' as $$
declare v_org uuid;
begin
  -- Only the existing SECURITY DEFINER company bootstrap may seed its categories.
  -- Every financial mutation RPC remains SECURITY INVOKER and reaches the guard.
  if tg_table_name='categories' and tg_op='INSERT' and current_user not in ('authenticated','anon','service_role') then return new; end if;
  if tg_table_name='organizations' then v_org=old.id;
  elsif tg_op='DELETE' then v_org=old.organization_id; else v_org=new.organization_id; end if;
  if not private.company_can_write(v_org) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='P0001'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
do $$ declare t text; begin
  foreach t in array array['accounts','categories','clients','transactions','transfers','recurring_transactions'] loop
    execute format('create trigger billing_write_guard before insert or update or delete on public.%I for each row execute function private.enforce_subscription_write()',t);
  end loop;
end $$;
create trigger billing_delete_guard before delete on public.organizations for each row execute function private.enforce_subscription_write();

-- Only owners initiate billing. This reservation prevents concurrent checkout duplicates.
create function public.begin_billing_checkout(p_org uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.subscriptions;
begin
  if not private.has_role(p_org,array['owner']::public.member_role[]) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  select * into s from public.subscriptions where organization_id=p_org for update;
  if not found then raise exception 'BILLING_UNAVAILABLE'; end if;
  if s.checkout_expires_at is null or s.checkout_expires_at<=statement_timestamp() then
    update public.subscriptions set checkout_key=gen_random_uuid(),checkout_expires_at=statement_timestamp()+interval '1 hour',checkout_session_id=null,checkout_url=null where id=s.id returning * into s;
  end if;
  return jsonb_build_object('organizationId',p_org,'subscriptionId',s.id,'customerId',s.provider_customer_id,'providerSubscriptionId',s.provider_subscription_id,
    'key',s.checkout_key,'expiresAt',s.checkout_expires_at,'url',s.checkout_url,'sessionId',s.checkout_session_id);
end; $$;
create function public.billing_set_customer(p_org uuid,p_provider text,p_customer text) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.subscriptions set payment_provider=p_provider,provider_customer_id=p_customer where organization_id=p_org and (provider_customer_id is null or (provider_customer_id=p_customer and payment_provider=p_provider));
  if not found then raise exception 'BILLING_CUSTOMER_MISMATCH'; end if;
end; $$;
create function public.billing_save_checkout(p_org uuid,p_key uuid,p_session text,p_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.subscriptions set checkout_session_id=p_session,checkout_url=p_url where organization_id=p_org and checkout_key=p_key and checkout_expires_at>statement_timestamp();
  if not found then raise exception 'BILLING_CHECKOUT_STALE'; end if;
end; $$;

-- Lease BEFORE fetching the provider's current state. Fencing stops stale workers;
-- a duplicate or out-of-order event cannot overwrite a newer fetched snapshot.
create function public.claim_billing_event(p_org uuid,p_provider text,p_event_id text,p_event_type text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.subscriptions; e public.billing_events; v_token uuid=gen_random_uuid();
begin
  select * into s from public.subscriptions where organization_id=p_org for update;
  if not found then raise exception 'BILLING_SUBSCRIPTION_NOT_FOUND'; end if;
  select * into e from public.billing_events where provider=p_provider and event_id=p_event_id;
  if found and e.organization_id is distinct from p_org then raise exception 'BILLING_EVENT_MISMATCH'; end if;
  if e.processed_at is not null then return jsonb_build_object('duplicate',true,'token',null); end if;
  if s.sync_expires_at>statement_timestamp() then raise exception 'BILLING_SYNC_BUSY'; end if;
  insert into public.billing_events(provider,event_id,event_type,organization_id) values(p_provider,p_event_id,p_event_type,p_org) on conflict(provider,event_id) do nothing;
  update public.subscriptions set sync_token=v_token,sync_expires_at=statement_timestamp()+interval '2 minutes' where id=s.id;
  return jsonb_build_object('duplicate',false,'token',v_token);
end; $$;
create function public.release_billing_event(p_org uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$
  begin update public.subscriptions set sync_token=null,sync_expires_at=null where organization_id=p_org and sync_token=p_token; end;
$$;
create function public.apply_billing_event(p_org uuid,p_token uuid,p_event_id text,p_snapshot jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.subscriptions; v_status public.subscription_status; v_start timestamptz; v_end timestamptz; v_provider text=p_snapshot->>'provider';
begin
  select * into s from public.subscriptions where organization_id=p_org for update;
  if not found or p_token is null or s.sync_token is null or s.sync_token is distinct from p_token or s.sync_expires_at<=statement_timestamp() then raise exception 'BILLING_SYNC_STALE'; end if;
  if s.id::text is distinct from p_snapshot->>'billingId' or p_org::text is distinct from p_snapshot->>'organizationId'
    or s.payment_provider is distinct from v_provider or s.provider_customer_id is distinct from p_snapshot->>'customerId' then raise exception 'BILLING_CUSTOMER_MISMATCH'; end if;
  if not exists(select 1 from public.billing_events where provider=v_provider and event_id=p_event_id and organization_id=p_org and processed_at is null) then raise exception 'BILLING_EVENT_MISMATCH'; end if;
  if s.provider_subscription_id is not null and s.provider_subscription_id is distinct from p_snapshot->>'subscriptionId' then
    if exists(select 1 from public.billing_events where organization_id=p_org and processed_at is not null and payload->>'subscriptionId'=p_snapshot->>'subscriptionId') then
      -- A late notification from a superseded subscription must not change the new one.
      update public.billing_events set payload=p_snapshot,processed_at=statement_timestamp() where provider=v_provider and event_id=p_event_id;
      update public.subscriptions set sync_token=null,sync_expires_at=null where id=s.id;
      return;
    end if;
    if not s.provider_terminal or s.current_period_end>statement_timestamp() then raise exception 'BILLING_SUBSCRIPTION_MISMATCH'; end if;
  end if;
  v_status=(p_snapshot->>'status')::public.subscription_status;
  v_start=(p_snapshot->>'periodStart')::timestamptz; v_end=(p_snapshot->>'periodEnd')::timestamptz;
  if v_status='active' and (v_start is null or v_end is null or v_end<=v_start) then raise exception 'BILLING_UNPAID_PERIOD'; end if;
  -- An unpaid checkout, including cancellation, never shortens the original free trial.
  if s.status='trialing' and s.trial_ends_at>statement_timestamp() and
    (v_status in ('past_due','expired') or (v_status='canceled' and v_start is null)) then v_status='trialing'; end if;
  update public.subscriptions set status=v_status,provider_subscription_id=p_snapshot->>'subscriptionId',provider_terminal=coalesce((p_snapshot->>'terminal')::boolean,false),
    current_period_start=coalesce(v_start,current_period_start),current_period_end=coalesce(v_end,current_period_end),
    cancel_at_period_end=coalesce((p_snapshot->>'cancelAtPeriodEnd')::boolean,false),canceled_at=(p_snapshot->>'canceledAt')::timestamptz,
    sync_token=null,sync_expires_at=null,checkout_url=null,checkout_session_id=null,checkout_expires_at=statement_timestamp() where id=s.id;
  update public.billing_events set payload=p_snapshot,processed_at=statement_timestamp() where provider=v_provider and event_id=p_event_id;
  raise log 'billing subscription_changed organization=% status=% event=%',p_org,v_status,p_event_id;
end; $$;

revoke execute on function private.initialize_subscription(),private.subscription_can_write(public.subscription_status,timestamptz,timestamptz,timestamptz,timestamptz),private.company_can_write(uuid),private.enforce_subscription_write() from public,anon,authenticated;
grant execute on function private.company_can_write(uuid) to authenticated,service_role;
revoke execute on function public.get_subscription_access(uuid),public.begin_billing_checkout(uuid) from public,anon;
grant execute on function public.get_subscription_access(uuid),public.begin_billing_checkout(uuid) to authenticated;
revoke execute on function public.billing_set_customer(uuid,text,text),public.billing_save_checkout(uuid,uuid,text,text),public.claim_billing_event(uuid,text,text,text),public.release_billing_event(uuid,uuid),public.apply_billing_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.billing_set_customer(uuid,text,text),public.billing_save_checkout(uuid,uuid,text,text),public.claim_billing_event(uuid,text,text,text),public.release_billing_event(uuid,uuid),public.apply_billing_event(uuid,uuid,text,jsonb) to service_role;
commit;
