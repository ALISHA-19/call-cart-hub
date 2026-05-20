REVOKE EXECUTE ON FUNCTION public.meter_api_call(text, text, text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.meter_api_call(text, text, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.meter_api_call(text, text, text, integer, text) FROM authenticated;