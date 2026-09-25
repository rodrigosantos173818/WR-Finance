-- Recovered from the WR Finance database schema on 2026-09-25 (no user data).

-- Dashboard functions and date triggers are defined in subsequent migrations.

begin;

set local search_path = public;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create type "public"."account_type" as enum ('bank', 'cash', 'pix', 'wallet', 'card', 'other');

create type "public"."member_role" as enum ('owner', 'admin', 'member');

create type "public"."payment_method" as enum ('pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card', 'boleto', 'other');

create type "public"."transaction_status" as enum ('pending', 'paid', 'cancelled');

create type "public"."transaction_type" as enum ('income', 'expense');

create table "public"."organizations" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "slug" text not null,
  "logo_url" text,
  "timezone" text default 'America/Sao_Paulo'::text not null,
  "currency" text default 'BRL'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."organization_members" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "user_id" uuid not null,
  "role" member_role default 'member'::member_role not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."accounts" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "name" text not null,
  "type" account_type default 'bank'::account_type not null,
  "opening_balance" numeric(14,2) default 0 not null,
  "opening_date" date default ((now() AT TIME ZONE 'America/Sao_Paulo'::text))::date not null,
  "archived" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."categories" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "name" text not null,
  "type" transaction_type not null,
  "icon" text default 'tag'::text not null,
  "color" text default 'primary'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."clients" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "name" text not null,
  "company" text,
  "email" text,
  "phone" text,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."recurring_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "account_id" uuid not null,
  "category_id" uuid not null,
  "client_id" uuid,
  "type" transaction_type not null,
  "description" text not null,
  "amount" numeric(14,2) not null,
  "interval_months" smallint default 1 not null,
  "next_due_date" date not null,
  "end_date" date,
  "payment_method" payment_method default 'pix'::payment_method not null,
  "is_fixed" boolean default false not null,
  "active" boolean default true not null,
  "notes" text,
  "created_by" uuid default auth.uid() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."transactions" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "account_id" uuid not null,
  "category_id" uuid not null,
  "client_id" uuid,
  "type" transaction_type not null,
  "description" text not null,
  "amount" numeric(14,2) not null,
  "competence_date" date not null,
  "due_date" date not null,
  "paid_at" date,
  "status" transaction_status default 'pending'::transaction_status not null,
  "payment_method" payment_method default 'pix'::payment_method not null,
  "is_fixed" boolean default false not null,
  "is_recurring" boolean default false not null,
  "recurring_transaction_id" uuid,
  "notes" text,
  "created_by" uuid default auth.uid() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."transfers" (
  "id" uuid default gen_random_uuid() not null,
  "organization_id" uuid not null,
  "from_account_id" uuid not null,
  "to_account_id" uuid not null,
  "amount" numeric(14,2) not null,
  "transferred_at" date not null,
  "notes" text,
  "created_by" uuid default auth.uid() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table "public"."accounts" add constraint "accounts_name_check" CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 80)));

alter table "public"."accounts" add constraint "accounts_organization_id_id_key" UNIQUE (organization_id, id);

alter table "public"."accounts" add constraint "accounts_organization_id_name_key" UNIQUE (organization_id, name);

alter table "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY (id);

alter table "public"."categories" add constraint "categories_color_check" CHECK ((color = ANY (ARRAY['primary'::text, 'positive'::text, 'mint'::text, 'info'::text, 'violet'::text, 'warning'::text])));

alter table "public"."categories" add constraint "categories_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 60)));

alter table "public"."categories" add constraint "categories_organization_id_id_key" UNIQUE (organization_id, id);

alter table "public"."categories" add constraint "categories_organization_id_id_type_key" UNIQUE (organization_id, id, type);

alter table "public"."categories" add constraint "categories_organization_id_type_name_key" UNIQUE (organization_id, type, name);

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY (id);

alter table "public"."clients" add constraint "clients_name_check" CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 100)));

alter table "public"."clients" add constraint "clients_organization_id_id_key" UNIQUE (organization_id, id);

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY (id);

alter table "public"."organization_members" add constraint "organization_members_organization_id_user_id_key" UNIQUE (organization_id, user_id);

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY (id);

alter table "public"."organizations" add constraint "organizations_currency_check" CHECK ((currency = 'BRL'::text));

alter table "public"."organizations" add constraint "organizations_name_check" CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 100)));

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY (id);

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE (slug);

alter table "public"."organizations" add constraint "organizations_timezone_check" CHECK ((timezone = 'America/Sao_Paulo'::text));

alter table "public"."recurring_transactions" add constraint "recurring_transactions_amount_check" CHECK ((amount > (0)::numeric));

alter table "public"."recurring_transactions" add constraint "recurring_transactions_check" CHECK (((end_date IS NULL) OR (end_date >= next_due_date)));

alter table "public"."recurring_transactions" add constraint "recurring_transactions_description_check" CHECK (((length(btrim(description)) >= 2) AND (length(btrim(description)) <= 200)));

alter table "public"."recurring_transactions" add constraint "recurring_transactions_interval_months_check" CHECK (((interval_months >= 1) AND (interval_months <= 12)));

alter table "public"."recurring_transactions" add constraint "recurring_transactions_organization_id_id_key" UNIQUE (organization_id, id);

alter table "public"."recurring_transactions" add constraint "recurring_transactions_pkey" PRIMARY KEY (id);

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount > (0)::numeric));

alter table "public"."transactions" add constraint "transactions_check" CHECK ((((status = 'paid'::transaction_status) AND (paid_at IS NOT NULL)) OR ((status <> 'paid'::transaction_status) AND (paid_at IS NULL))));

alter table "public"."transactions" add constraint "transactions_check1" CHECK (((NOT is_recurring) OR (recurring_transaction_id IS NOT NULL)));

alter table "public"."transactions" add constraint "transactions_description_check" CHECK (((length(btrim(description)) >= 2) AND (length(btrim(description)) <= 200)));

alter table "public"."transactions" add constraint "transactions_notes_check" CHECK ((length(notes) <= 5000));

alter table "public"."transactions" add constraint "transactions_organization_id_id_key" UNIQUE (organization_id, id);

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY (id);

alter table "public"."transactions" add constraint "transactions_recurring_transaction_id_due_date_key" UNIQUE (recurring_transaction_id, due_date);

alter table "public"."transfers" add constraint "transfers_amount_check" CHECK ((amount > (0)::numeric));

alter table "public"."transfers" add constraint "transfers_check" CHECK ((from_account_id <> to_account_id));

alter table "public"."transfers" add constraint "transfers_notes_check" CHECK ((length(notes) <= 5000));

alter table "public"."transfers" add constraint "transfers_pkey" PRIMARY KEY (id);

alter table "public"."accounts" add constraint "accounts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."categories" add constraint "categories_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."clients" add constraint "clients_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."recurring_transactions" add constraint "recurring_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table "public"."recurring_transactions" add constraint "recurring_transactions_organization_id_account_id_fkey" FOREIGN KEY (organization_id, account_id) REFERENCES accounts(organization_id, id);

alter table "public"."recurring_transactions" add constraint "recurring_transactions_organization_id_category_id_type_fkey" FOREIGN KEY (organization_id, category_id, type) REFERENCES categories(organization_id, id, type);

alter table "public"."recurring_transactions" add constraint "recurring_transactions_organization_id_client_id_fkey" FOREIGN KEY (organization_id, client_id) REFERENCES clients(organization_id, id);

alter table "public"."recurring_transactions" add constraint "recurring_transactions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."transactions" add constraint "transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table "public"."transactions" add constraint "transactions_organization_id_account_id_fkey" FOREIGN KEY (organization_id, account_id) REFERENCES accounts(organization_id, id);

alter table "public"."transactions" add constraint "transactions_organization_id_category_id_type_fkey" FOREIGN KEY (organization_id, category_id, type) REFERENCES categories(organization_id, id, type);

alter table "public"."transactions" add constraint "transactions_organization_id_client_id_fkey" FOREIGN KEY (organization_id, client_id) REFERENCES clients(organization_id, id);

alter table "public"."transactions" add constraint "transactions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."transactions" add constraint "transactions_organization_id_recurring_transaction_id_fkey" FOREIGN KEY (organization_id, recurring_transaction_id) REFERENCES recurring_transactions(organization_id, id);

alter table "public"."transfers" add constraint "transfers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table "public"."transfers" add constraint "transfers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."transfers" add constraint "transfers_organization_id_from_account_id_fkey" FOREIGN KEY (organization_id, from_account_id) REFERENCES accounts(organization_id, id);

alter table "public"."transfers" add constraint "transfers_organization_id_to_account_id_fkey" FOREIGN KEY (organization_id, to_account_id) REFERENCES accounts(organization_id, id);

CREATE INDEX transactions_category_idx ON public.transactions USING btree (organization_id, category_id);

CREATE INDEX members_user_idx ON public.organization_members USING btree (user_id, organization_id);

CREATE INDEX transfers_to_idx ON public.transfers USING btree (organization_id, to_account_id, transferred_at);

CREATE INDEX transactions_paid_idx ON public.transactions USING btree (organization_id, paid_at) WHERE (status = 'paid'::transaction_status);

CREATE INDEX transfers_from_idx ON public.transfers USING btree (organization_id, from_account_id, transferred_at);

CREATE INDEX recurring_due_idx ON public.recurring_transactions USING btree (organization_id, next_due_date) WHERE active;

CREATE INDEX transactions_client_idx ON public.transactions USING btree (organization_id, client_id);

CREATE INDEX transactions_due_idx ON public.transactions USING btree (organization_id, due_date) WHERE (status = 'pending'::transaction_status);

CREATE INDEX transactions_account_idx ON public.transactions USING btree (organization_id, account_id);

CREATE OR REPLACE FUNCTION private.keep_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op='INSERT' and (new.created_by is distinct from auth.uid()) then raise exception 'Autor inválido.' using errcode='42501'; end if;
  if tg_op='UPDATE' and new.created_by<>old.created_by then raise exception 'O autor não pode ser alterado.' using errcode='42501'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION private.is_member(p_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.organization_members where organization_id=p_org and user_id=(select auth.uid()));
$function$
;

CREATE OR REPLACE FUNCTION private.has_role(p_org uuid, p_roles member_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.organization_members where organization_id=p_org and user_id=(select auth.uid()) and role=any(p_roles));
$function$
;

CREATE OR REPLACE FUNCTION private.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.updated_at=now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION private.keep_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.organization_id<>old.organization_id or new.id<>old.id then raise exception 'A organização e a identificação não podem ser alteradas.' using errcode='42501'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION private.protect_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Serialize changes for a company so concurrent removals cannot remove its last owner.
  perform 1 from public.organizations where id=old.organization_id for update;
  if not found then return old; end if;
  if tg_op='UPDATE' and (new.user_id<>old.user_id or new.organization_id<>old.organization_id or new.id<>old.id) then
    raise exception 'A associação não pode ser transferida.' using errcode='42501';
  end if;
  if old.role='owner' and (tg_op='DELETE' or new.role<>'owner') and
    (select count(*) from public.organization_members where organization_id=old.organization_id and role='owner')<=1 then
    raise exception 'A empresa precisa manter um proprietário.' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.get_my_organizations()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'role',m.role) order by o.created_at),'[]'::jsonb)
  from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=(select auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization(p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_org uuid=gen_random_uuid(); v_user uuid=auth.uid();
begin
  if v_user is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  if length(btrim(p_name)) not between 2 and 100 then raise exception 'Nome da empresa inválido.' using errcode='22023'; end if;
  insert into public.organizations(id,name,slug) values(v_org,btrim(p_name),'empresa-'||v_org::text);
  insert into public.organization_members(organization_id,user_id,role) values(v_org,v_user,'owner');
  insert into public.categories(organization_id,name,type,icon,color) values
    (v_org,'Vendas','income','shopping-bag','positive'),(v_org,'Serviços','income','briefcase','primary'),(v_org,'Outras receitas','income','tag','mint'),
    (v_org,'Marketing','expense','megaphone','primary'),(v_org,'Software','expense','laptop','info'),(v_org,'Salários','expense','users','mint'),
    (v_org,'Aluguel','expense','building','violet'),(v_org,'Energia','expense','zap','warning'),(v_org,'Internet','expense','wifi','info'),
    (v_org,'Impostos','expense','landmark','violet'),(v_org,'Compras','expense','shopping-bag','primary'),(v_org,'Transporte','expense','car','warning'),(v_org,'Outras despesas','expense','tag','mint');
  return v_org;
end; $function$
;

CREATE OR REPLACE FUNCTION public.create_account(p_org uuid, p_name text, p_type account_type, p_opening_balance numeric, p_opening_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_opening_balance<>round(p_opening_balance,2) then raise exception 'Use no máximo duas casas decimais.' using errcode='22023'; end if;
  insert into public.accounts(organization_id,name,type,opening_balance,opening_date) values(p_org,btrim(p_name),p_type,p_opening_balance,p_opening_date) returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.create_transaction(p_org uuid, p_account uuid, p_category uuid, p_client uuid, p_type transaction_type, p_description text, p_amount numeric, p_competence_date date, p_due_date date, p_paid_at date, p_status transaction_status, p_payment_method payment_method, p_is_fixed boolean, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_amount<>round(p_amount,2) then raise exception 'Use no máximo duas casas decimais.' using errcode='22023'; end if;
  if p_paid_at>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'A efetivação não pode estar no futuro.' using errcode='22023'; end if;
  insert into public.transactions(organization_id,account_id,category_id,client_id,type,description,amount,competence_date,due_date,paid_at,status,payment_method,is_fixed,notes)
  values(p_org,p_account,p_category,p_client,p_type,btrim(p_description),p_amount,p_competence_date,p_due_date,p_paid_at,p_status,p_payment_method,p_is_fixed,p_notes) returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.settle_transaction(p_org uuid, p_transaction uuid, p_account uuid, p_paid_at date, p_payment_method payment_method)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_paid_at is null or p_paid_at>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data de efetivação inválida.' using errcode='22023'; end if;
  update public.transactions set account_id=p_account,paid_at=p_paid_at,payment_method=p_payment_method,status='paid' where organization_id=p_org and id=p_transaction and status='pending';
  if not found then raise exception 'Lançamento indisponível ou já efetivado.' using errcode='22023'; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.create_transfer(p_org uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_amount<>round(p_amount,2) or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Valor ou data inválidos.' using errcode='22023'; end if;
  insert into public.transfers(organization_id,from_account_id,to_account_id,amount,transferred_at,notes) values(p_org,p_from,p_to,p_amount,p_date,p_notes) returning id into v_id;
  return v_id;
end; $function$
;

CREATE TRIGGER protect_membership BEFORE DELETE OR UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION private.protect_membership();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_tenant BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION private.keep_tenant();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER keep_author BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.keep_author();

CREATE TRIGGER keep_author BEFORE INSERT OR UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION private.keep_author();

CREATE TRIGGER keep_author BEFORE INSERT OR UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION private.keep_author();

CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

alter table "public"."organizations" enable row level security;

revoke all on table "public"."organizations" from public, anon, authenticated, service_role;

alter table "public"."organization_members" enable row level security;

revoke all on table "public"."organization_members" from public, anon, authenticated, service_role;

alter table "public"."accounts" enable row level security;

revoke all on table "public"."accounts" from public, anon, authenticated, service_role;

alter table "public"."categories" enable row level security;

revoke all on table "public"."categories" from public, anon, authenticated, service_role;

alter table "public"."clients" enable row level security;

revoke all on table "public"."clients" from public, anon, authenticated, service_role;

alter table "public"."recurring_transactions" enable row level security;

revoke all on table "public"."recurring_transactions" from public, anon, authenticated, service_role;

alter table "public"."transactions" enable row level security;

revoke all on table "public"."transactions" from public, anon, authenticated, service_role;

alter table "public"."transfers" enable row level security;

revoke all on table "public"."transfers" from public, anon, authenticated, service_role;

create policy "organizations_delete" on "public"."organizations" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(id, ARRAY['owner'::member_role]));

create policy "organizations_update" on "public"."organizations" as PERMISSIVE for UPDATE to "authenticated" using (private.has_role(id, ARRAY['owner'::member_role, 'admin'::member_role])) with check (private.has_role(id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "organizations_insert" on "public"."organizations" as PERMISSIVE for INSERT to "authenticated" with check (false);

create policy "organizations_select" on "public"."organizations" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(id));

create policy "members_delete" on "public"."organization_members" as PERMISSIVE for DELETE to "authenticated" using ((private.has_role(organization_id, ARRAY['owner'::member_role]) OR ((role = 'member'::member_role) AND private.has_role(organization_id, ARRAY['admin'::member_role]))));

create policy "members_update" on "public"."organization_members" as PERMISSIVE for UPDATE to "authenticated" using ((private.has_role(organization_id, ARRAY['owner'::member_role]) OR ((role = 'member'::member_role) AND private.has_role(organization_id, ARRAY['admin'::member_role])))) with check ((private.has_role(organization_id, ARRAY['owner'::member_role]) OR ((role = 'member'::member_role) AND private.has_role(organization_id, ARRAY['admin'::member_role]))));

create policy "members_insert" on "public"."organization_members" as PERMISSIVE for INSERT to "authenticated" with check ((private.has_role(organization_id, ARRAY['owner'::member_role]) OR ((role = 'member'::member_role) AND private.has_role(organization_id, ARRAY['admin'::member_role]))));

create policy "members_select" on "public"."organization_members" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."accounts" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."accounts" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."accounts" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."accounts" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."categories" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."categories" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."categories" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."categories" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."clients" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."clients" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."clients" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."clients" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."recurring_transactions" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."recurring_transactions" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."recurring_transactions" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."recurring_transactions" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."transactions" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."transactions" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."transactions" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."transactions" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

create policy "tenant_delete" on "public"."transfers" as PERMISSIVE for DELETE to "authenticated" using (private.has_role(organization_id, ARRAY['owner'::member_role, 'admin'::member_role]));

create policy "tenant_update" on "public"."transfers" as PERMISSIVE for UPDATE to "authenticated" using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy "tenant_insert" on "public"."transfers" as PERMISSIVE for INSERT to "authenticated" with check (private.is_member(organization_id));

create policy "tenant_select" on "public"."transfers" as PERMISSIVE for SELECT to "authenticated" using (private.is_member(organization_id));

grant USAGE on schema "public" to PUBLIC;

grant USAGE on schema "public" to "anon";

grant USAGE on schema "public" to "authenticated";

grant USAGE on schema "public" to "service_role";

grant USAGE on schema "private" to "authenticated";

grant INSERT on table "public"."organizations" to "authenticated";

grant SELECT on table "public"."organizations" to "authenticated";

grant UPDATE on table "public"."organizations" to "authenticated";

grant DELETE on table "public"."organizations" to "authenticated";

grant TRUNCATE on table "public"."organizations" to "authenticated";

grant REFERENCES on table "public"."organizations" to "authenticated";

grant TRIGGER on table "public"."organizations" to "authenticated";

grant MAINTAIN on table "public"."organizations" to "authenticated";

grant INSERT on table "public"."organizations" to "service_role";

grant SELECT on table "public"."organizations" to "service_role";

grant UPDATE on table "public"."organizations" to "service_role";

grant DELETE on table "public"."organizations" to "service_role";

grant TRUNCATE on table "public"."organizations" to "service_role";

grant REFERENCES on table "public"."organizations" to "service_role";

grant TRIGGER on table "public"."organizations" to "service_role";

grant MAINTAIN on table "public"."organizations" to "service_role";

grant INSERT on table "public"."organization_members" to "authenticated";

grant SELECT on table "public"."organization_members" to "authenticated";

grant UPDATE on table "public"."organization_members" to "authenticated";

grant DELETE on table "public"."organization_members" to "authenticated";

grant TRUNCATE on table "public"."organization_members" to "authenticated";

grant REFERENCES on table "public"."organization_members" to "authenticated";

grant TRIGGER on table "public"."organization_members" to "authenticated";

grant MAINTAIN on table "public"."organization_members" to "authenticated";

grant INSERT on table "public"."organization_members" to "service_role";

grant SELECT on table "public"."organization_members" to "service_role";

grant UPDATE on table "public"."organization_members" to "service_role";

grant DELETE on table "public"."organization_members" to "service_role";

grant TRUNCATE on table "public"."organization_members" to "service_role";

grant REFERENCES on table "public"."organization_members" to "service_role";

grant TRIGGER on table "public"."organization_members" to "service_role";

grant MAINTAIN on table "public"."organization_members" to "service_role";

grant INSERT on table "public"."accounts" to "authenticated";

grant SELECT on table "public"."accounts" to "authenticated";

grant UPDATE on table "public"."accounts" to "authenticated";

grant DELETE on table "public"."accounts" to "authenticated";

grant TRUNCATE on table "public"."accounts" to "authenticated";

grant REFERENCES on table "public"."accounts" to "authenticated";

grant TRIGGER on table "public"."accounts" to "authenticated";

grant MAINTAIN on table "public"."accounts" to "authenticated";

grant INSERT on table "public"."accounts" to "service_role";

grant SELECT on table "public"."accounts" to "service_role";

grant UPDATE on table "public"."accounts" to "service_role";

grant DELETE on table "public"."accounts" to "service_role";

grant TRUNCATE on table "public"."accounts" to "service_role";

grant REFERENCES on table "public"."accounts" to "service_role";

grant TRIGGER on table "public"."accounts" to "service_role";

grant MAINTAIN on table "public"."accounts" to "service_role";

grant INSERT on table "public"."categories" to "authenticated";

grant SELECT on table "public"."categories" to "authenticated";

grant UPDATE on table "public"."categories" to "authenticated";

grant DELETE on table "public"."categories" to "authenticated";

grant TRUNCATE on table "public"."categories" to "authenticated";

grant REFERENCES on table "public"."categories" to "authenticated";

grant TRIGGER on table "public"."categories" to "authenticated";

grant MAINTAIN on table "public"."categories" to "authenticated";

grant INSERT on table "public"."categories" to "service_role";

grant SELECT on table "public"."categories" to "service_role";

grant UPDATE on table "public"."categories" to "service_role";

grant DELETE on table "public"."categories" to "service_role";

grant TRUNCATE on table "public"."categories" to "service_role";

grant REFERENCES on table "public"."categories" to "service_role";

grant TRIGGER on table "public"."categories" to "service_role";

grant MAINTAIN on table "public"."categories" to "service_role";

grant INSERT on table "public"."clients" to "authenticated";

grant SELECT on table "public"."clients" to "authenticated";

grant UPDATE on table "public"."clients" to "authenticated";

grant DELETE on table "public"."clients" to "authenticated";

grant TRUNCATE on table "public"."clients" to "authenticated";

grant REFERENCES on table "public"."clients" to "authenticated";

grant TRIGGER on table "public"."clients" to "authenticated";

grant MAINTAIN on table "public"."clients" to "authenticated";

grant INSERT on table "public"."clients" to "service_role";

grant SELECT on table "public"."clients" to "service_role";

grant UPDATE on table "public"."clients" to "service_role";

grant DELETE on table "public"."clients" to "service_role";

grant TRUNCATE on table "public"."clients" to "service_role";

grant REFERENCES on table "public"."clients" to "service_role";

grant TRIGGER on table "public"."clients" to "service_role";

grant MAINTAIN on table "public"."clients" to "service_role";

grant INSERT on table "public"."recurring_transactions" to "authenticated";

grant SELECT on table "public"."recurring_transactions" to "authenticated";

grant UPDATE on table "public"."recurring_transactions" to "authenticated";

grant DELETE on table "public"."recurring_transactions" to "authenticated";

grant TRUNCATE on table "public"."recurring_transactions" to "authenticated";

grant REFERENCES on table "public"."recurring_transactions" to "authenticated";

grant TRIGGER on table "public"."recurring_transactions" to "authenticated";

grant MAINTAIN on table "public"."recurring_transactions" to "authenticated";

grant INSERT on table "public"."recurring_transactions" to "service_role";

grant SELECT on table "public"."recurring_transactions" to "service_role";

grant UPDATE on table "public"."recurring_transactions" to "service_role";

grant DELETE on table "public"."recurring_transactions" to "service_role";

grant TRUNCATE on table "public"."recurring_transactions" to "service_role";

grant REFERENCES on table "public"."recurring_transactions" to "service_role";

grant TRIGGER on table "public"."recurring_transactions" to "service_role";

grant MAINTAIN on table "public"."recurring_transactions" to "service_role";

grant INSERT on table "public"."transactions" to "authenticated";

grant SELECT on table "public"."transactions" to "authenticated";

grant UPDATE on table "public"."transactions" to "authenticated";

grant DELETE on table "public"."transactions" to "authenticated";

grant TRUNCATE on table "public"."transactions" to "authenticated";

grant REFERENCES on table "public"."transactions" to "authenticated";

grant TRIGGER on table "public"."transactions" to "authenticated";

grant MAINTAIN on table "public"."transactions" to "authenticated";

grant INSERT on table "public"."transactions" to "service_role";

grant SELECT on table "public"."transactions" to "service_role";

grant UPDATE on table "public"."transactions" to "service_role";

grant DELETE on table "public"."transactions" to "service_role";

grant TRUNCATE on table "public"."transactions" to "service_role";

grant REFERENCES on table "public"."transactions" to "service_role";

grant TRIGGER on table "public"."transactions" to "service_role";

grant MAINTAIN on table "public"."transactions" to "service_role";

grant INSERT on table "public"."transfers" to "authenticated";

grant SELECT on table "public"."transfers" to "authenticated";

grant UPDATE on table "public"."transfers" to "authenticated";

grant DELETE on table "public"."transfers" to "authenticated";

grant TRUNCATE on table "public"."transfers" to "authenticated";

grant REFERENCES on table "public"."transfers" to "authenticated";

grant TRIGGER on table "public"."transfers" to "authenticated";

grant MAINTAIN on table "public"."transfers" to "authenticated";

grant INSERT on table "public"."transfers" to "service_role";

grant SELECT on table "public"."transfers" to "service_role";

grant UPDATE on table "public"."transfers" to "service_role";

grant DELETE on table "public"."transfers" to "service_role";

grant TRUNCATE on table "public"."transfers" to "service_role";

grant REFERENCES on table "public"."transfers" to "service_role";

grant TRIGGER on table "public"."transfers" to "service_role";

grant MAINTAIN on table "public"."transfers" to "service_role";

revoke all on function "private"."keep_author"() from public, anon, authenticated, service_role;

revoke all on function "private"."is_member"(p_org uuid) from public, anon, authenticated, service_role;

revoke all on function "private"."has_role"(p_org uuid, p_roles member_role[]) from public, anon, authenticated, service_role;

revoke all on function "private"."touch_updated_at"() from public, anon, authenticated, service_role;

revoke all on function "private"."keep_tenant"() from public, anon, authenticated, service_role;

revoke all on function "private"."protect_membership"() from public, anon, authenticated, service_role;

revoke all on function "public"."get_my_organizations"() from public, anon, authenticated, service_role;

revoke all on function "public"."create_organization"(p_name text) from public, anon, authenticated, service_role;

revoke all on function "public"."create_account"(p_org uuid, p_name text, p_type account_type, p_opening_balance numeric, p_opening_date date) from public, anon, authenticated, service_role;

revoke all on function "public"."create_transaction"(p_org uuid, p_account uuid, p_category uuid, p_client uuid, p_type transaction_type, p_description text, p_amount numeric, p_competence_date date, p_due_date date, p_paid_at date, p_status transaction_status, p_payment_method payment_method, p_is_fixed boolean, p_notes text) from public, anon, authenticated, service_role;

revoke all on function "public"."settle_transaction"(p_org uuid, p_transaction uuid, p_account uuid, p_paid_at date, p_payment_method payment_method) from public, anon, authenticated, service_role;

revoke all on function "public"."create_transfer"(p_org uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date, p_notes text) from public, anon, authenticated, service_role;

grant EXECUTE on function "private"."is_member"(p_org uuid) to "authenticated";

grant EXECUTE on function "private"."has_role"(p_org uuid, p_roles member_role[]) to "authenticated";

grant EXECUTE on function "public"."get_my_organizations"() to "authenticated";

grant EXECUTE on function "public"."get_my_organizations"() to "service_role";

grant EXECUTE on function "public"."create_organization"(p_name text) to "authenticated";

grant EXECUTE on function "public"."create_organization"(p_name text) to "service_role";

grant EXECUTE on function "public"."create_account"(p_org uuid, p_name text, p_type account_type, p_opening_balance numeric, p_opening_date date) to "authenticated";

grant EXECUTE on function "public"."create_account"(p_org uuid, p_name text, p_type account_type, p_opening_balance numeric, p_opening_date date) to "service_role";

grant EXECUTE on function "public"."create_transaction"(p_org uuid, p_account uuid, p_category uuid, p_client uuid, p_type transaction_type, p_description text, p_amount numeric, p_competence_date date, p_due_date date, p_paid_at date, p_status transaction_status, p_payment_method payment_method, p_is_fixed boolean, p_notes text) to "authenticated";

grant EXECUTE on function "public"."create_transaction"(p_org uuid, p_account uuid, p_category uuid, p_client uuid, p_type transaction_type, p_description text, p_amount numeric, p_competence_date date, p_due_date date, p_paid_at date, p_status transaction_status, p_payment_method payment_method, p_is_fixed boolean, p_notes text) to "service_role";

grant EXECUTE on function "public"."settle_transaction"(p_org uuid, p_transaction uuid, p_account uuid, p_paid_at date, p_payment_method payment_method) to "authenticated";

grant EXECUTE on function "public"."settle_transaction"(p_org uuid, p_transaction uuid, p_account uuid, p_paid_at date, p_payment_method payment_method) to "service_role";

grant EXECUTE on function "public"."create_transfer"(p_org uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date, p_notes text) to "authenticated";

grant EXECUTE on function "public"."create_transfer"(p_org uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date, p_notes text) to "service_role";

commit;
