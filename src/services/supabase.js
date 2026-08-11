// Единая точка подключения к Supabase.
// Поведение не менялось — просто вынесено из index.html.
const SUPABASE_URL = "https://bwnlfisppygnmxaylytm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_A3ymKs56JwPIeYQRuREKpA_byNmqfPs";

// supabase-js подключается через <script> в index.html и кладёт
// глобальный объект `supabase` в window — используем его тут же.
export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
