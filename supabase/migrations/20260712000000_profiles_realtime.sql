-- Enable realtime updates for new user profile signups on /users.

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;
