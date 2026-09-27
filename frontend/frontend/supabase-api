(() => {
  const client = window.julietaSupabaseClient;
  function resultOrThrow(result) {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }

  function customerFields(row) {
    const customer = row.customers || {};
    return { ...row, customer_name: customer.name || '-', customer_phone: customer.phone || '' };
  }

  async function dashboard() {
    const [customersResult, invoicesResult, depositsResult, damagesResult] = await Promise.all([
      client.from('customers').select('*').order('id', { ascending: false }),
      client.from('invoices').select('*, customers(name, phone)').order('due_date'),
      client.from('deposits').select('*, customers(name, bank_name, account_number), deposit_damages(*)').order('deposited_at', { ascending: false }),
      client.from('deposit_damages').select('*').order('created_at', { ascending: false })
    ]);
    const customers = resultOrThrow(customersResult);
    const invoices = resultOrThrow(invoicesResult).map(row => ({
      ...customerFields(row),
      services: row.services_json || []
    }));
    const deposits = resultOrThrow(depositsResult).map(row => ({
      ...customerFields(row),
      bank_name: row.customers?.bank_name || '',
      account_number: row.customers?.account_number || '',
      damages: row.deposit_damages || []
    }));
    const damages = resultOrThrow(damagesResult).map(row => ({
      ...row,
      customer_name: deposits.find(deposit => deposit.id === row.deposit_id)?.customer_name || '-'
    }));
    const today = new Date().toISOString().slice(0, 10);

    return {
      customers: customers.length,
      receivable: invoices.reduce((sum, row) => sum + Number(row.total_amount) - Number(row.paid_amount), 0),
      deposit_total: deposits.reduce((sum, row) => sum + Number(row.amount) - Number(row.returned_amount) - Number(row.damaged_amount), 0),
      overdue: invoices.filter(row => row.due_date < today && row.status !== 'Lunas').length,
      invoices,
      deposits,
      damages
    };
  }

  async function catalog() {
    const [servicesResult, zonesResult] = await Promise.all([
      client.from('service_catalog').select('name, min_price, max_price, standard_price').order('name'),
      client.from('location_zones').select('name, fee').order('fee')
    ]);
    return {
      services: resultOrThrow(servicesResult),
      zones: resultOrThrow(zonesResult)
    };
  }

  async function rpc(name, args) {
    return resultOrThrow(await client.rpc(name, args));
  }

  async function api(path, options = {}) {
    const method = options.method || 'GET';
    const payload = options.body ? JSON.parse(options.body) : {};

    if (!client) throw new Error('Konfigurasi Supabase belum diisi.');
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Silakan masuk menggunakan akun Supabase terlebih dahulu.');

    if (path === '/api/dashboard' && method === 'GET') return dashboard();
    if (path === '/api/catalog' && method === 'GET') return catalog();
    if (path === '/api/customers' && method === 'GET') {
      return resultOrThrow(await client.from('customers').select('*').order('id', { ascending: false }));
    }
    if (path === '/api/invoices' && method === 'GET') {
      return resultOrThrow(await client.from('invoices').select('*, customers(name, phone)').order('due_date'))
        .map(row => ({ ...customerFields(row), services: row.services_json || [] }));
    }
    if (path === '/api/deposits' && method === 'GET') {
      return resultOrThrow(await client.from('deposits').select('*, customers(name, bank_name, account_number), deposit_damages(*)').order('deposited_at', { ascending: false }))
        .map(row => ({ ...customerFields(row), bank_name: row.customers?.bank_name || '', account_number: row.customers?.account_number || '', damages: row.deposit_damages || [] }));
    }
    if (path === '/api/settings' && method === 'GET') {
      const rows = resultOrThrow(await client.from('app_settings').select('setting_key, setting_value'));
      return Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value]));
    }
    if (path === '/api/transactions' && method === 'GET') {
      return resultOrThrow(await client.from('transaction_logs').select('*').order('created_at', { ascending: false }).limit(100));
    }
    if (path === '/api/customers' && method === 'POST') return rpc('create_customer', { p_payload: payload });
    if (path === '/api/settings' && method === 'POST') return rpc('set_admin_name', { p_payload: payload });
    if (path === '/api/invoices' && method === 'POST') return rpc('create_invoice', { p_payload: payload });
    if (path === '/api/deposits' && method === 'POST') return rpc('create_deposit', { p_payload: payload });

    const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
    if (customerMatch && method === 'PUT') {
      return rpc('update_customer', { p_customer_id: Number(customerMatch[1]), p_payload: payload });
    }
    const paymentMatch = path.match(/^\/api\/invoices\/(\d+)\/pay$/);
    if (paymentMatch && method === 'POST') {
      return rpc('record_payment', { p_invoice_id: Number(paymentMatch[1]), p_payload: payload });
    }
    const damageMatch = path.match(/^\/api\/deposits\/(\d+)\/damage$/);
    if (damageMatch && method === 'POST') {
      return rpc('record_damage', { p_deposit_id: Number(damageMatch[1]), p_payload: payload });
    }
    const returnMatch = path.match(/^\/api\/deposits\/(\d+)\/return$/);
    if (returnMatch && method === 'POST') {
      return rpc('return_deposit', { p_deposit_id: Number(returnMatch[1]), p_payload: payload });
    }
    throw new Error(`Endpoint Supabase tidak ditemukan: ${method} ${path}`);
  }

  window.julietaSupabase = { configured: Boolean(client), api };
})();
