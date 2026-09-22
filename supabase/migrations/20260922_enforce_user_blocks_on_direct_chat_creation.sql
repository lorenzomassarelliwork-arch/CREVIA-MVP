
create or replace function public.enforce_direct_chat_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'direct'
    and public.users_are_blocked(new.direct_user_a,new.direct_user_b) then
    raise exception 'DIRECT_CONTACT_BLOCKED';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_direct_chat_block() from public, anon, authenticated;

drop trigger if exists enforce_direct_chat_block_insert on public.chat_conversations;
create trigger enforce_direct_chat_block_insert
before insert on public.chat_conversations
for each row execute procedure public.enforce_direct_chat_block();
