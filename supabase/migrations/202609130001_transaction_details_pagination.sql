begin;

-- Preserve the original call through defaults, while allowing access beyond 100 records.
drop function public.get_transaction_details(uuid,date,date,public.transaction_type,uuid,boolean);
create function public.get_transaction_details(
  p_org uuid, p_start date, p_end date,
  p_type public.transaction_type default null, p_category uuid default null,
  p_pending boolean default false, p_offset integer default 0
)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if not private.is_member(p_org) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_start is null or p_end is null or p_start>p_end or p_end-p_start>3660
    or p_offset is null or p_offset<0 or p_pending is null then
    raise exception 'Filtro inválido.' using errcode='22023';
  end if;

  with matching as materialized (
    select t.* from public.transactions t
    where t.organization_id=p_org
      and (p_type is null or t.type=p_type)
      and (p_category is null or t.category_id=p_category)
      and ((p_pending and t.status='pending')
        or (not p_pending and t.status='paid' and t.paid_at between p_start and p_end))
  ), page as (
    select * from matching order by due_date,id limit 100 offset p_offset
  )
  select jsonb_build_object(
    'count',(select count(*) from matching),
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',t.id,'description',t.description,'amount',t.amount::text,
      'type',t.type,'status',t.status,'due_date',t.due_date,'paid_at',t.paid_at,
      'account_id',a.id,'account',a.name,'category',c.name,'category_id',c.id,
      'client',cl.name,'payment_method',t.payment_method,'notes',t.notes
    ) order by t.due_date,t.id)
    from page t
      join public.accounts a on a.id=t.account_id and a.organization_id=t.organization_id
      join public.categories c on c.id=t.category_id and c.organization_id=t.organization_id
      left join public.clients cl on cl.id=t.client_id and cl.organization_id=t.organization_id
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;

revoke execute on function public.get_transaction_details(uuid,date,date,public.transaction_type,uuid,boolean,integer) from public,anon;
grant execute on function public.get_transaction_details(uuid,date,date,public.transaction_type,uuid,boolean,integer) to authenticated;

commit;
