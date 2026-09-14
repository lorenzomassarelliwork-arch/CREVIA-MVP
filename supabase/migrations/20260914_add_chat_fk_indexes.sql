create index chat_conversations_direct_user_b_idx
  on public.chat_conversations(direct_user_b);

create index chat_read_state_user_id_idx
  on public.chat_read_state(user_id);
