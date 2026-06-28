
create or replace function public.award_quiz_xp(_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wk date;
begin
  if uid is null or _amount is null or _amount <= 0 then
    return;
  end if;
  if _amount > 50 then _amount := 50; end if;

  update public.profiles
     set xp = coalesce(xp, 0) + _amount,
         updated_at = now()
   where id = uid;

  wk := (date_trunc('week', (timezone('Asia/Kolkata', now()))::date)::date);
  insert into public.weekly_xp (user_id, week_start, xp)
       values (uid, wk, _amount)
  on conflict (user_id, week_start)
  do update set xp = public.weekly_xp.xp + excluded.xp;
end;
$$;

revoke all on function public.award_quiz_xp(int) from public;
grant execute on function public.award_quiz_xp(int) to authenticated;
