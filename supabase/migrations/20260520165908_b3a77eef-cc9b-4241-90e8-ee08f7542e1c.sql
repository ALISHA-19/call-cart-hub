ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key TEXT;

CREATE OR REPLACE FUNCTION public.meter_api_call(_key_hash text, _slug text, _ip text, _response_time_ms integer, _method text DEFAULT 'GET')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_api record;
  v_sub record;
  v_status int;
begin
  select id into v_user_id from public.profiles where api_key_hash = _key_hash limit 1;

  select * into v_api from public.apis where endpoint_slug = _slug limit 1;
  if v_api.id is null then
    v_status := 404;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, null, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'API not found');
  end if;

  if v_user_id is null then
    v_status := 401;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (null, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'Invalid API key');
  end if;

  if upper(v_api.method) <> upper(_method) then
    v_status := 405;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'Method ' || _method || ' not allowed. Expected ' || v_api.method);
  end if;

  select * into v_sub from public.subscriptions
    where user_id = v_user_id and api_id = v_api.id for update;
  if v_sub.id is null then
    v_status := 403;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'No active subscription for this API');
  end if;

  if v_sub.remaining_calls <= 0 then
    v_status := 429;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'Quota exceeded. Please top up.');
  end if;

  update public.subscriptions set remaining_calls = remaining_calls - 1 where id = v_sub.id;
  v_status := 200;
  insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
    values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);

  return jsonb_build_object('status', v_status, 'data', v_api.dummy_response, 'remaining', v_sub.remaining_calls - 1);
end;
$function$;