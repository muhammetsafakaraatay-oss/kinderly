create extension if not exists pg_net;

create or replace function public.notify_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text;
  anon_key text;
begin
  begin
    execute $sql$
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'project_url'
      limit 1
    $sql$ into project_url;

    execute $sql$
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'anon_key'
      limit 1
    $sql$ into anon_key;
  exception
    when sqlstate '3F000' or sqlstate '42P01' then
      raise log 'send-push trigger skipped because vault secrets are unavailable';
      return new;
  end;

  if project_url is null or anon_key is null then
    raise log 'send-push trigger skipped because vault secrets are missing';
    return new;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );

  return new;
end;
$$;

drop trigger if exists trigger_send_push_on_message on public.mesajlar;

create trigger trigger_send_push_on_message
after insert on public.mesajlar
for each row
execute function public.notify_message_insert();
