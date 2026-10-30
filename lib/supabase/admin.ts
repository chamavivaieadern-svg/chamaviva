import { createClient } from "@supabase/supabase-js";

/** Use exclusivamente em rotas server-side. Nunca importe este módulo em componentes client. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
