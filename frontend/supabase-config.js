const SUPABASE_URL = 'https://ijhfiwozbvpudspvrpfs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wXd_GAUVXwOHn17WnbOkdw_o-c0xYgr';

const supabaseConfigured = !SUPABASE_URL.includes('YOUR_PROJECT_ID')
  && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_SUPABASE_ANON_KEY');

if (supabaseConfigured && !window.supabase?.createClient) {
  throw new Error('Library Supabase tidak berhasil dimuat.');
}

window.julietaSupabaseClient = supabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
