begin;

-- Explicit NULL must be rejected just like out-of-range chart lengths.
-- CREATE OR REPLACE preserves the existing authenticated-only grants.
create or replace function public.get_dashboard(p_org uuid,p_start date,p_end date,p_chart_months integer default 6)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_today date=(now() at time zone 'America/Sao_Paulo')::date;
  v_previous_start date; v_previous_end date=p_start-1; v_chart_start date;
  v_accounts jsonb; v_summary jsonb; v_categories jsonb; v_chart jsonb; v_recent jsonb;
begin
  if not private.is_member(p_org) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_start is null or p_end is null or p_start>p_end or p_end-p_start>3660 or p_chart_months is null or p_chart_months not between 1 and 12 then
    raise exception 'Período inválido.' using errcode='22023';
  end if;
  if p_start=date_trunc('month',p_start)::date and p_end=(p_start+interval '1 month - 1 day')::date then
    v_previous_start=(p_start-interval '1 month')::date;
  else v_previous_start=p_start-(p_end-p_start+1); end if;
  v_chart_start=(date_trunc('month',v_today)-make_interval(months=>p_chart_months-1))::date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'name',a.name,'type',a.type,'archived',a.archived,
    'balance',(case when a.opening_date<=v_today then a.opening_balance else 0 end
      +coalesce((select sum(case when t.type='income' then t.amount else -t.amount end) from public.transactions t where t.organization_id=p_org and t.account_id=a.id and t.status='paid' and t.paid_at<=v_today),0)
      +coalesce((select sum(f.amount) from public.transfers f where f.organization_id=p_org and f.to_account_id=a.id and f.transferred_at<=v_today),0)
      -coalesce((select sum(f.amount) from public.transfers f where f.organization_id=p_org and f.from_account_id=a.id and f.transferred_at<=v_today),0))::text
  ) order by a.created_at),'[]'::jsonb) into v_accounts from public.accounts a where a.organization_id=p_org;

  select jsonb_build_object(
    'balance',(select coalesce(sum((item->>'balance')::numeric),0)::text from jsonb_array_elements(v_accounts) item),
    'income',coalesce(sum(amount) filter(where type='income' and status='paid' and paid_at between p_start and p_end),0)::text,
    'expense',coalesce(sum(amount) filter(where type='expense' and status='paid' and paid_at between p_start and p_end),0)::text,
    'result',coalesce(sum(case when type='income' then amount else -amount end) filter(where status='paid' and paid_at between p_start and p_end),0)::text,
    'previous_income',coalesce(sum(amount) filter(where type='income' and status='paid' and paid_at between v_previous_start and v_previous_end),0)::text,
    'previous_expense',coalesce(sum(amount) filter(where type='expense' and status='paid' and paid_at between v_previous_start and v_previous_end),0)::text,
    'receivable',coalesce(sum(amount) filter(where type='income' and status='pending'),0)::text,
    'payable',coalesce(sum(amount) filter(where type='expense' and status='pending'),0)::text,
    'receivable_week',count(*) filter(where type='income' and status='pending' and due_date between v_today and v_today+6),
    'payable_week',count(*) filter(where type='expense' and status='pending' and due_date between v_today and v_today+6),
    'receivable_overdue',count(*) filter(where type='income' and status='pending' and due_date<v_today),
    'payable_overdue',count(*) filter(where type='expense' and status='pending' and due_date<v_today)
  ) into v_summary from public.transactions where organization_id=p_org;

  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'color',c.color,'amount',c.total::text) order by c.total desc),'[]'::jsonb)
  into v_categories from (
    select c.id,c.name,c.color,sum(t.amount) total from public.categories c join public.transactions t on t.organization_id=c.organization_id and t.category_id=c.id
    where t.organization_id=p_org and t.type='expense' and t.status='paid' and t.paid_at between p_start and p_end group by c.id
  ) c;
  select coalesce(jsonb_agg(jsonb_build_object('month',to_char(m,'YYYY-MM'),
    'income',coalesce((select sum(amount) from public.transactions where organization_id=p_org and type='income' and status='paid' and paid_at>=m::date and paid_at<(m+interval '1 month')::date),0)::text,
    'expense',coalesce((select sum(amount) from public.transactions where organization_id=p_org and type='expense' and status='paid' and paid_at>=m::date and paid_at<(m+interval '1 month')::date),0)::text
  ) order by m),'[]'::jsonb) into v_chart from generate_series(v_chart_start::timestamp,date_trunc('month',v_today),interval '1 month') m;

  select coalesce(jsonb_agg(r.obj order by r.created_at desc),'[]'::jsonb) into v_recent from (
    select t.created_at,jsonb_build_object('id',t.id,'description',t.description,'amount',t.amount::text,'type',t.type,'status',t.status,'due_date',t.due_date,'paid_at',t.paid_at,
      'account_id',a.id,'account',a.name,'category',c.name,'category_id',c.id,'client',cl.name,'payment_method',t.payment_method,'notes',t.notes) obj
    from public.transactions t join public.accounts a on a.id=t.account_id and a.organization_id=t.organization_id
      join public.categories c on c.id=t.category_id and c.organization_id=t.organization_id
      left join public.clients cl on cl.id=t.client_id and cl.organization_id=t.organization_id
    where t.organization_id=p_org and coalesce(t.paid_at,t.due_date) between p_start and p_end order by t.created_at desc,t.id limit 6
  ) r;
  return jsonb_build_object('today',v_today,'summary',v_summary,'accounts',v_accounts,'expense_categories',v_categories,'monthly',v_chart,'recent',v_recent,
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'type',type,'color',color) order by name) from public.categories where organization_id=p_org),'[]'::jsonb),
    'clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.clients where organization_id=p_org),'[]'::jsonb)
  );
end; $$;

commit;
