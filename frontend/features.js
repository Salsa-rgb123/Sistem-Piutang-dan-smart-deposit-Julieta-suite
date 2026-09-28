(() => {
  const state = { view: 'overview', dashboard: null, customers: [] };
  const appView = document.getElementById('app-view');
  const pageTitle = document.getElementById('page-title');
  const storeKey = 'varapay-offline-data';
  const defaultAdmin = 'Admin Julieta';
  let activeAdmin = localStorage.getItem('varapay-admin-name') || defaultAdmin;
  if (activeAdmin === 'Admin VaraPay') activeAdmin = defaultAdmin;
  const titles = { overview: 'Ringkasan bisnis', receivables: 'Piutang & penagihan', deposits: 'Smart deposit', customers: 'Data pelanggan' };
  const services = [
    { name: 'Event Organizer (Full Service)', min: 15000000, max: 25000000, standard: 20000000 },
    { name: 'Decoration', min: 25000000, max: 65000000, standard: 45000000 },
    { name: 'Make Up Artist (MUA)', min: 5000000, max: 9000000, standard: 7000000 },
    { name: 'Wardrobe', min: 7500000, max: 18000000, standard: 12750000 },
    { name: 'Catering (500 pax)', min: 45000000, max: 90000000, standard: 67500000 },
    { name: 'Photobooth', min: 4000000, max: 7000000, standard: 5500000 },
    { name: 'MC', min: 3500000, max: 7500000, standard: 5500000 },
    { name: 'Penampilan Sanggar', min: 4500000, max: 9000000, standard: 6750000 }
  ];
  const zones = [
    { name: 'Zona 1 (Semarang & Sekitarnya)', fee: 0 },
    { name: 'Zona 2 (Jateng & Jogja)', fee: 2500000 },
    { name: 'Zona 3 (Destination Domestic - Jakarta/Bali)', fee: 7500000 },
    { name: 'Zona 4 (ASEAN / International - SG, MY, Brunei)', fee: 25000000 }
  ];
  const money = amount => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
  const todayISO = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
  const dateText = value => value ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '-';
  function localTimestamp(recordedAt) { const now = new Date(); return `${recordedAt || todayISO()}T${[now.getHours(), now.getMinutes(), now.getSeconds()].map(part => String(part).padStart(2, '0')).join(':')}`; }
  const initials = name => (name || 'AV').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const customerCell = name => `<span class="customer-cell"><span class="mini-avatar">${initials(name)}</span>${name || '-'}</span>`;
  const actorPayload = payload => ({ ...payload, admin_name: activeAdmin });

  function localData() {
    const data = JSON.parse(localStorage.getItem(storeKey) || '{}');
    data.customers ||= [
      { id: 1, name: 'Raka & Naya', phone: '0812-7788-1100', email: 'raka.naya@email.com', event_date: '2026-10-18', venue: 'Gedung Serbaguna Cempaka' },
      { id: 2, name: 'Dimas & Alya', phone: '0813-4567-2288', email: 'dimas.alya@email.com', event_date: '2026-11-07', venue: 'Amarta Garden' }
    ];
    data.invoices ||= [
      { id: 1, invoice_number: 'INV-26001', customer_id: 1, customer_name: 'Raka & Naya', description: 'Paket dekorasi premium', total_amount: 18500000, paid_amount: 10000000, due_date: '2026-09-28', status: 'Sebagian' },
      { id: 2, invoice_number: 'INV-26002', customer_id: 2, customer_name: 'Dimas & Alya', description: 'Wedding organizer full day', total_amount: 24000000, paid_amount: 0, due_date: '2026-09-25', status: 'Menunggu' }
    ];
    data.deposits ||= [{ id: 1, customer_id: 1, customer_name: 'Raka & Naya', amount: 5000000, returned_amount: 0, damaged_amount: 0, status: 'Tersimpan', notes: 'Jaminan properti dekorasi' }];
    data.damages ||= [];
    data.transactions ||= [];
    data.settings ||= { admin_name: activeAdmin };
    if (data.settings.admin_name === 'Admin VaraPay') data.settings.admin_name = defaultAdmin;
    data.customers.forEach(customer => { customer.phone ||= ''; customer.bank_name ||= ''; customer.account_number ||= ''; });
    data.invoices.forEach(invoice => {
      const customer = data.customers.find(item => Number(item.id) === Number(invoice.customer_id));
      invoice.customer_phone ||= customer?.phone || '';
      invoice.customer_name ||= customer?.name || '-';
      invoice.admin_name ||= defaultAdmin;
    });
    data.deposits.forEach(deposit => { deposit.damaged_amount ||= 0; deposit.admin_name ||= defaultAdmin; });
    localStorage.setItem(storeKey, JSON.stringify(data));
    return data;
  }

  function saveLocal(data) {
    localStorage.setItem(storeKey, JSON.stringify(data));
    return data;
  }

  function recordLocal(data, type, id, details, recordedAt) {
    data.transactions.unshift({ id: Date.now(), transaction_type: type, reference_id: id, admin_name: activeAdmin, details, created_at: localTimestamp(recordedAt) });
  }

  function offlineApi(path, options = {}) {
    const data = localData();
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    if (path === '/api/catalog' && method === 'GET') return { services: services.map(service => ({ name: service.name, min_price: service.min, max_price: service.max, standard_price: service.standard })), zones: zones.map(zone => ({ name: zone.name, fee: zone.fee })) };
    if (path === '/api/dashboard' && method === 'GET') {
      const invoices = data.invoices.map(invoice => ({ ...invoice, customer_name: data.customers.find(customer => customer.id === Number(invoice.customer_id))?.name || invoice.customer_name || '-', customer_phone: data.customers.find(customer => customer.id === Number(invoice.customer_id))?.phone || '' }));
      const deposits = data.deposits.map(deposit => { const customer = data.customers.find(item => Number(item.id) === Number(deposit.customer_id)); return { ...deposit, customer_name: customer?.name || deposit.customer_name || '-', bank_name: customer?.bank_name || '', account_number: customer?.account_number || '', damages: data.damages.filter(damage => Number(damage.deposit_id) === Number(deposit.id)) }; });
      const damages = data.damages.map(damage => ({ ...damage, customer_name: deposits.find(deposit => Number(deposit.id) === Number(damage.deposit_id))?.customer_name || '-' }));
      return { customers: data.customers.length, receivable: invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount) - Number(invoice.paid_amount), 0), deposit_total: deposits.reduce((sum, deposit) => sum + Number(deposit.amount) - Number(deposit.returned_amount) - Number(deposit.damaged_amount), 0), overdue: invoices.filter(invoice => invoice.due_date < new Date().toISOString().slice(0, 10) && invoice.status !== 'Lunas').length, invoices, deposits, damages };
    }
    if (path === '/api/customers' && method === 'GET') return data.customers;
    if (path === '/api/invoices' && method === 'GET') return data.invoices;
    if (path === '/api/deposits' && method === 'GET') return data.deposits;
    if (path === '/api/settings' && method === 'GET') return data.settings;
    if (path === '/api/transactions' && method === 'GET') return data.transactions;
    if (path === '/api/settings' && method === 'POST') { data.settings.admin_name = body.admin_name; saveLocal(data); return data.settings; }
    if (path === '/api/customers' && method === 'POST') {
      if (!body.bank_name?.trim() || !body.account_number?.trim()) throw new Error('Nama bank dan nomor rekening wajib diisi.');
      const item = { ...body, id: Date.now(), admin_name: activeAdmin, created_at: localTimestamp(body.recorded_at) };
      data.customers.push(item); recordLocal(data, 'Pelanggan', item.id, `Tambah pelanggan ${item.name}`, body.recorded_at); saveLocal(data); return item;
    }
    const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
    if (customerMatch && method === 'DELETE') {
      const customerId = Number(customerMatch[1]);
      const invoiceIds = data.invoices.filter(invoice => Number(invoice.customer_id) === customerId).map(invoice => Number(invoice.id));
      const depositIds = data.deposits.filter(deposit => Number(deposit.customer_id) === customerId).map(deposit => Number(deposit.id));
      data.damages = data.damages.filter(damage => !depositIds.includes(Number(damage.deposit_id)));
      data.invoices = data.invoices.filter(invoice => Number(invoice.customer_id) !== customerId);
      data.deposits = data.deposits.filter(deposit => Number(deposit.customer_id) !== customerId);
      data.customers = data.customers.filter(customer => Number(customer.id) !== customerId);
      data.transactions = data.transactions.filter(transaction => !(
        (transaction.transaction_type === 'Pelanggan' && Number(transaction.reference_id) === customerId) ||
        (['Piutang', 'Penagihan'].includes(transaction.transaction_type) && invoiceIds.includes(Number(transaction.reference_id))) ||
        (['Deposit', 'Potongan kerusakan', 'Pengembalian deposit'].includes(transaction.transaction_type) && depositIds.includes(Number(transaction.reference_id)))
      ));
      saveLocal(data);
      return { id: customerId };
    }
    if (customerMatch && method === 'PUT') {
      const item = data.customers.find(customer => Number(customer.id) === Number(customerMatch[1]));
      if (!body.bank_name?.trim() || !body.account_number?.trim()) throw new Error('Nama bank dan nomor rekening wajib diisi.');
      Object.assign(item, body); saveLocal(data); return item;
    }
    if (path === '/api/invoices' && method === 'POST') {
      const zone = zones.find(item => item.name === body.location_zone);
      const selectedServices = [...new Set(body.service_types || [])].map(name => services.find(item => item.name === name));
      if (!zone || !selectedServices.length || selectedServices.some(service => !service)) throw new Error('Pilih minimal satu jasa dan zona lokasi acara.');
      const serviceAmount = selectedServices.reduce((sum, service) => sum + service.standard, 0);
      const total = serviceAmount + zone.fee;
      const paid = Number(body.paid_amount || 0);
      if (paid < 0 || paid > total) throw new Error('Pembayaran awal tidak boleh melebihi total tagihan.');
      const serviceItems = selectedServices.map(service => ({ name: service.name, amount: service.standard }));
      const item = { ...body, id: Date.now(), invoice_number: `INV-${Date.now().toString().slice(-8)}`, customer_name: data.customers.find(customer => Number(customer.id) === Number(body.customer_id))?.name || '-', services: serviceItems, service_type: selectedServices.map(service => service.name).join(', '), service_amount: serviceAmount, location_fee: zone.fee, total_amount: total, paid_amount: paid, status: paid >= total ? 'Lunas' : paid ? 'Sebagian' : 'Menunggu', created_at: localTimestamp(body.recorded_at) };
      data.invoices.push(item); recordLocal(data, 'Piutang', item.id, `Catat ${item.invoice_number}`, body.recorded_at); saveLocal(data); return item;
    }
    const invoiceDeleteMatch = path.match(/^\/api\/invoices\/(\d+)$/);
    if (invoiceDeleteMatch && method === 'DELETE') {
      const invoiceId = Number(invoiceDeleteMatch[1]);
      data.invoices = data.invoices.filter(invoice => Number(invoice.id) !== invoiceId);
      data.transactions = data.transactions.filter(transaction => !(['Piutang', 'Penagihan'].includes(transaction.transaction_type) && Number(transaction.reference_id) === invoiceId));
      saveLocal(data);
      return { id: invoiceId };
    }
    if (path === '/api/deposits' && method === 'POST') {
      const item = { ...body, id: Date.now(), customer_name: data.customers.find(customer => Number(customer.id) === Number(body.customer_id))?.name || '-', amount: Number(body.amount), returned_amount: 0, damaged_amount: 0, status: 'Tersimpan', deposited_at: localTimestamp(body.recorded_at) };
      data.deposits.push(item); recordLocal(data, 'Deposit', item.id, `Setor deposit ${money(item.amount)}`, body.recorded_at); saveLocal(data); return item;
    }
    const depositDeleteMatch = path.match(/^\/api\/deposits\/(\d+)$/);
    if (depositDeleteMatch && method === 'DELETE') {
      const depositId = Number(depositDeleteMatch[1]);
      data.deposits = data.deposits.filter(deposit => Number(deposit.id) !== depositId);
      data.damages = data.damages.filter(damage => Number(damage.deposit_id) !== depositId);
      data.transactions = data.transactions.filter(transaction => !(['Deposit', 'Potongan kerusakan', 'Pengembalian deposit'].includes(transaction.transaction_type) && Number(transaction.reference_id) === depositId));
      saveLocal(data);
      return { id: depositId };
    }
    const paymentMatch = path.match(/^\/api\/invoices\/(\d+)\/pay$/);
    if (paymentMatch && method === 'POST') {
      const invoice = data.invoices.find(item => Number(item.id) === Number(paymentMatch[1]));
      const amount = Number(body.paid_amount);
      if (!invoice || amount <= 0 || invoice.paid_amount + amount > invoice.total_amount) throw new Error('Nominal pembayaran melebihi sisa tagihan.');
      invoice.paid_amount += amount; invoice.status = invoice.paid_amount >= invoice.total_amount ? 'Lunas' : 'Sebagian'; invoice.admin_name = activeAdmin;
      invoice.last_payment_at = localTimestamp(body.recorded_at);
      recordLocal(data, 'Penagihan', invoice.id, `Pembayaran ${invoice.invoice_number} ${money(amount)}`, body.recorded_at); saveLocal(data); return invoice;
    }
    const damageMatch = path.match(/^\/api\/deposits\/(\d+)\/damage$/);
    if (damageMatch && method === 'POST') {
      const deposit = data.deposits.find(item => Number(item.id) === Number(damageMatch[1]));
      const total = Number(body.quantity) * Number(body.replacement_cost);
      if (!deposit || Number(body.quantity) <= 0 || Number(body.replacement_cost) <= 0 || deposit.returned_amount + deposit.damaged_amount + total > deposit.amount) throw new Error('Potongan kerusakan melebihi sisa deposit.');
      const damage = { ...body, id: Date.now(), deposit_id: deposit.id, total_cost: total, admin_name: activeAdmin, created_at: localTimestamp(body.recorded_at) };
      data.damages.unshift(damage); deposit.damaged_amount += total; deposit.status = 'Dipotong Kerusakan'; deposit.admin_name = activeAdmin;
      recordLocal(data, 'Potongan kerusakan', deposit.id, `${damage.item_name} x${damage.quantity}, ${money(total)}`, body.recorded_at); saveLocal(data); return damage;
    }
    const returnMatch = path.match(/^\/api\/deposits\/(\d+)\/return$/);
    if (returnMatch && method === 'POST') {
      const deposit = data.deposits.find(item => Number(item.id) === Number(returnMatch[1]));
      const amount = Number(body.returned_amount);
      if (!deposit || amount <= 0 || deposit.returned_amount + deposit.damaged_amount + amount > deposit.amount) throw new Error('Nominal melebihi sisa deposit.');
      deposit.returned_amount += amount; deposit.admin_name = activeAdmin;
      deposit.status = deposit.damaged_amount ? 'Dipotong Kerusakan' : deposit.returned_amount === deposit.amount ? 'Dikembalikan' : 'Dikembalikan Sebagian';
      deposit.last_returned_at = localTimestamp(body.recorded_at);
      recordLocal(data, 'Pengembalian deposit', deposit.id, `Pengembalian ${money(amount)}`, body.recorded_at); saveLocal(data); return deposit;
    }
    throw new Error('Endpoint offline tidak ditemukan.');
  }

  window.api = async (path, options = {}) => {
    return offlineApi(path, options);
  };

  function updateAdminDisplay() {
    const name = activeAdmin || defaultAdmin;
    const display = document.getElementById('admin-display');
    const avatar = document.getElementById('admin-avatar');
    if (display) display.textContent = name;
    if (avatar) avatar.textContent = initials(name);
  }

  function setDatabaseStatus() {
    const label = document.querySelector('.sidebar-foot span:not(.status-dot)');
    const detail = document.querySelector('.sidebar-foot small');
    if (label) label.textContent = 'Mode lokal';
    if (detail) detail.textContent = 'Data tersimpan di browser ini';
  }

  async function refreshData() {
    const [dashboard, customers, settings, catalog] = await Promise.all([window.api('/api/dashboard'), window.api('/api/customers'), window.api('/api/settings'), window.api('/api/catalog')]);
    setDatabaseStatus();
    services.splice(0, services.length, ...catalog.services.map(service => ({ name: service.name, min: service.min_price, max: service.max_price, standard: service.standard_price })));
    zones.splice(0, zones.length, ...catalog.zones.map(zone => ({ name: zone.name, fee: zone.fee })));
    state.dashboard = dashboard;
    state.customers = customers;
    activeAdmin = settings.admin_name || activeAdmin;
    localStorage.setItem('varapay-admin-name', activeAdmin);
    updateAdminDisplay();
    window.render();
  }

  function whatsappLink(invoice) {
    let digits = String(invoice.customer_phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
    const message = `Halo ${invoice.customer_name}, semoga persiapan hari bahagianya berjalan lancar. Kami ingin mengingatkan dengan ramah bahwa tagihan ${invoice.invoice_number} masih tersisa ${money(balance)} dan jatuh tempo pada ${dateText(invoice.due_date)}. Silakan kabari kami jika pembayaran sudah dilakukan atau ada yang ingin ditanyakan. Terima kasih, Julieta Event & Décor.`;
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
  }

  function whatsappButton(invoice, compact = false) {
    const link = whatsappLink(invoice);
    if (!link) return '<span class="contact-missing">Nomor belum diisi</span>';
    return `<a class="wa-button${compact ? ' wa-compact' : ''}" href="${link}" target="_blank" rel="noopener noreferrer" aria-label="Kirim pengingat WhatsApp ke ${invoice.customer_name}" title="Kirim pengingat melalui WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.3l1.2-4.9a8.4 8.4 0 1 1 16.3-3.7Z"/><path d="M8.2 7.7c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4 0 .6.5.9 1.2 1.6 2.1 2 .2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l1.7.8c.2.1.3.3.3.5 0 .4-.2 1.3-.8 1.7-.5.4-1.2.6-1.9.4-1-.2-2.2-.7-3.5-1.9-1.1-1-2.1-2.6-2.3-3.5-.2-.9.1-1.9.5-2.5Z"/></svg><span>${compact ? '' : 'WhatsApp'}</span></a>`;
  }

  function invoiceStatus(status) {
    const type = status === 'Lunas' ? 'paid' : status === 'Sebagian' ? 'partial' : 'wait';
    return `<span class="badge ${type}">${status}</span>`;
  }

  function paintServiceBadges(invoice, cell) {
    let selected = invoice.services;
    if (!Array.isArray(selected) || !selected.length) {
      selected = String(invoice.service_type || '').split(',').map(name => name.trim()).filter(Boolean);
    }
    if (!selected.length) return;
    const badges = document.createElement('div');
    badges.className = 'invoice-service-badges';
    selected.forEach(service => {
      const name = typeof service === 'string' ? service : service.name;
      const badge = document.createElement('span');
      badge.className = 'service-badge';
      badge.textContent = name;
      if (typeof service === 'object' && service.amount) badge.title = `Harga standar ${money(service.amount)}`;
      badges.append(badge);
    });
    const description = cell.querySelector('small');
    if (description) cell.insertBefore(badges, description);
    else cell.append(badges);
  }

  function renderStats() {
    const data = state.dashboard;
    return `<div class="stats"><div class="stat-card"><div class="stat-label">Total piutang <span class="stat-icon">◫</span></div><div class="stat-value">${money(data.receivable)}</div><div class="stat-note">Sisa yang perlu ditagih</div></div><div class="stat-card"><div class="stat-label">Smart deposit <span class="stat-icon">◇</span></div><div class="stat-value">${money(data.deposit_total)}</div><div class="stat-note">Saldo bersih setelah potongan</div></div><div class="stat-card"><div class="stat-label">Pelanggan aktif <span class="stat-icon">♧</span></div><div class="stat-value">${data.customers}</div><div class="stat-note">Kontrak dalam sistem</div></div><div class="stat-card"><div class="stat-label">Perlu ditagih <span class="stat-icon alert-stat-icon">!</span></div><div class="stat-value">${data.overdue}</div><div class="stat-note">Jatuh tempo perlu perhatian</div></div></div>`;
  }

  function renderOverview() {
    const data = state.dashboard;
    const outstanding = data.invoices.filter(invoice => invoice.status !== 'Lunas').slice(0, 4);
    appView.innerHTML = `${renderStats()}<div class="section-head"><div><h2>Aktivitas keuangan</h2><p>Piutang, pengingat, dan dana jaminan acara.</p></div><button class="primary-btn" data-action="invoice">+ Catat piutang</button></div><div class="grid-two"><section class="panel"><div class="panel-header"><h3>Piutang terbaru</h3><button class="text-link" data-view="receivables">Lihat semua →</button></div><div class="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Sisa tagihan</th><th>Jatuh tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${data.invoices.slice(0, 5).map(invoice => `<tr><td>${customerCell(invoice.customer_name)}</td><td class="amount">${money(invoice.total_amount - invoice.paid_amount)}</td><td>${dateText(invoice.due_date)}</td><td>${invoiceStatus(invoice.status)}</td><td>${invoice.status === 'Lunas' ? '—' : whatsappButton(invoice, true)}</td></tr>`).join('')}</tbody></table></div></section><section class="panel"><div class="panel-header"><h3>Pengingat penagihan</h3><span class="badge wait">${data.overdue} jatuh tempo</span></div><div class="alert-list">${outstanding.map(invoice => `<div class="alert"><div class="alert-mark">!</div><div class="alert-copy"><strong>${invoice.invoice_number} · ${invoice.customer_name}</strong><p>${money(invoice.total_amount - invoice.paid_amount)} · jatuh tempo ${dateText(invoice.due_date)}</p></div>${whatsappButton(invoice, true)}</div>`).join('') || '<div class="empty">Tidak ada tagihan terbuka.</div>'}</div></section></div>`;
  }

  function renderReceivables() {
    appView.innerHTML = `<div class="section-head"><div><h2>Daftar piutang</h2><p>Tagihan, kontak pelanggan, dan jejak admin pencatat.</p></div><button class="primary-btn" data-action="invoice">+ Catat piutang</button></div><div class="toolbar"><input class="search" id="invoice-search" placeholder="Cari pelanggan atau nomor invoice..."></div><div class="data-panel"><div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Pelanggan</th><th>Kontak</th><th>Total</th><th>Terbayar</th><th>Jatuh tempo</th><th>Status</th><th>Admin terakhir</th><th>Aksi</th></tr></thead><tbody id="invoice-table">${state.dashboard.invoices.map(invoice => `<tr><td><strong>${invoice.invoice_number}</strong><br><small>${invoice.description}</small></td><td>${customerCell(invoice.customer_name)}</td><td>${invoice.customer_phone || '<span class="contact-missing">Belum ada nomor</span>'}</td><td>${money(invoice.total_amount)}</td><td>${money(invoice.paid_amount)}</td><td>${dateText(invoice.due_date)}</td><td>${invoiceStatus(invoice.status)}</td><td>${invoice.admin_name || defaultAdmin}</td><td class="row-actions">${invoice.status !== 'Lunas' ? `<button class="text-link" data-pay="${invoice.id}" data-balance="${invoice.total_amount - invoice.paid_amount}">Catat bayar</button>${whatsappButton(invoice, true)}` : ''}<button class="text-link danger-link" data-delete-invoice="${invoice.id}">Hapus</button></td></tr>`).join('')}</tbody></table></div></div>`;
    state.dashboard.invoices.forEach((invoice, index) => {
      const cell = document.querySelectorAll('#invoice-table tr')[index]?.cells[0];
      if (cell) {
        paintServiceBadges(invoice, cell);
        const recorded = document.createElement('small');
        recorded.className = 'recorded-date';
        recorded.textContent = `Dicatat ${dateText(invoice.created_at)}`;
        cell.append(recorded);
      }
    });
    document.getElementById('invoice-search').addEventListener('input', event => { const query = event.target.value.toLowerCase(); document.querySelectorAll('#invoice-table tr').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); }); });
  }

  function renderDeposits() {
    const deposits = state.dashboard.deposits;
    const remainingTotal = deposits.reduce((sum, deposit) => sum + Number(deposit.amount) - Number(deposit.returned_amount) - Number(deposit.damaged_amount), 0);
    const damageRows = state.dashboard.damages || [];
    appView.innerHTML = `<div class="section-head"><div><h2>Smart deposit</h2><p>Rincian jaminan, potongan kerusakan, dan saldo yang dikembalikan.</p></div><button class="primary-btn" data-action="deposit">+ Catat deposit</button></div><div class="stats"><div class="stat-card"><div class="stat-label">Saldo belum diselesaikan <span class="stat-icon">◇</span></div><div class="stat-value">${money(remainingTotal)}</div><div class="stat-note">Setelah pengembalian dan potongan</div></div><div class="stat-card"><div class="stat-label">Total jaminan <span class="stat-icon">#</span></div><div class="stat-value">${deposits.length}</div><div class="stat-note">Transaksi deposit tercatat</div></div></div><div class="data-panel"><div class="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Deposit</th><th>Potongan</th><th>Dikembalikan</th><th>Sisa</th><th>Status</th><th>Admin</th><th>Aksi</th></tr></thead><tbody>${deposits.map(deposit => { const remaining = Number(deposit.amount) - Number(deposit.returned_amount) - Number(deposit.damaged_amount); const label = deposit.status || 'Tersimpan'; return `<tr><td>${customerCell(deposit.customer_name)}</td><td class="amount">${money(deposit.amount)}<br><small>${deposit.notes || ''}</small></td><td>${money(deposit.damaged_amount)}${deposit.damages?.length ? `<br><small>${deposit.damages.length} rincian</small>` : ''}</td><td>${money(deposit.returned_amount)}</td><td class="amount">${money(remaining)}</td><td><span class="badge ${deposit.damaged_amount ? 'partial' : remaining === 0 ? 'paid' : 'deposit'}">${label}</span></td><td>${deposit.admin_name || defaultAdmin}</td><td class="row-actions">${remaining > 0 ? `<button class="text-link" data-damage="${deposit.id}" data-remaining="${remaining}">Catat kerusakan</button><button class="text-link" data-return="${deposit.id}" data-remaining="${remaining}">Kembalikan sisa</button>` : 'Selesai'}</td></tr>`; }).join('')}</tbody></table></div></div><section class="panel damage-history"><div class="panel-header"><h3>Rincian aset rusak / hilang</h3><span class="muted-label">${damageRows.length} item tercatat</span></div><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pelanggan</th><th>Barang</th><th>Jumlah</th><th>Biaya satuan</th><th>Total potongan</th><th>Admin</th></tr></thead><tbody>${damageRows.map(damage => `<tr><td>${new Date(damage.created_at).toLocaleDateString('id-ID')}</td><td>${damage.customer_name || '-'}</td><td>${damage.item_name}</td><td>${damage.quantity}</td><td>${money(damage.replacement_cost)}</td><td class="amount">${money(damage.total_cost)}</td><td>${damage.admin_name || defaultAdmin}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada aset rusak atau hilang.</td></tr>'}</tbody></table></div></section>`;
    appView.querySelectorAll('.data-panel tbody tr').forEach((row, index) => {
      const deposit = deposits[index];
      const detail = document.createElement('small');
      detail.className = 'bank-details';
      detail.textContent = deposit.bank_name && deposit.account_number ? `${deposit.bank_name} · ${deposit.account_number}` : 'Rekening refund belum diisi';
      row.cells[0].append(detail);
      const recorded = document.createElement('small');
      recorded.className = 'recorded-date';
      recorded.textContent = `Dicatat ${dateText(deposit.deposited_at)}`;
      row.cells[1].append(recorded);
      const deleteButton = document.createElement('button');
      deleteButton.className = 'text-link danger-link';
      deleteButton.dataset.deleteDeposit = deposit.id;
      deleteButton.textContent = 'Hapus';
      row.lastElementChild.append(deleteButton);
    });
  }

  function renderCustomers() {
    appView.innerHTML = `<div class="section-head"><div><h2>Data pelanggan</h2><p>Nomor WhatsApp wajib agar pengingat tagihan bisa dikirim.</p></div><button class="primary-btn" data-action="customer">+ Tambah pelanggan</button></div><div class="data-panel"><div class="table-wrap"><table><thead><tr><th>Nama pasangan</th><th>Nomor kontak / WhatsApp</th><th>Email</th><th>Tanggal acara</th><th>Venue</th><th>Admin input</th><th>Aksi</th></tr></thead><tbody>${state.customers.map(customer => `<tr><td>${customerCell(customer.name)}</td><td>${customer.phone ? `<a class="phone-link" href="https://wa.me/${customer.phone.replace(/\D/g, '').replace(/^0/, '62')}" target="_blank" rel="noopener">${customer.phone}</a>` : '<span class="contact-missing">Nomor belum diisi</span>'}</td><td>${customer.email || '-'}</td><td>${dateText(customer.event_date)}</td><td>${customer.venue || '-'}</td><td>${customer.admin_name || defaultAdmin}</td><td><button class="text-link" data-edit-customer="${customer.id}">Edit</button><button class="text-link danger-link" data-delete-customer="${customer.id}">Hapus</button></td></tr>`).join('')}</tbody></table></div></div>`;
    const header = appView.querySelector('thead tr');
    const actionHeader = header.lastElementChild;
    ['Tanggal pencatatan', 'Bank pengembalian deposit', 'Nomor rekening'].forEach(label => {
      const cell = document.createElement('th');
      cell.textContent = label;
      header.insertBefore(cell, actionHeader);
    });
    appView.querySelectorAll('tbody tr').forEach((row, index) => {
      const customer = state.customers[index];
      const actionCell = row.lastElementChild;
      const recordedCell = document.createElement('td');
      const bankCell = document.createElement('td');
      const accountCell = document.createElement('td');
      recordedCell.textContent = dateText(customer.created_at);
      bankCell.textContent = customer.bank_name || 'Belum diisi';
      accountCell.textContent = customer.account_number || 'Belum diisi';
      row.insertBefore(recordedCell, actionCell);
      row.insertBefore(bankCell, actionCell);
      row.insertBefore(accountCell, actionCell);
    });
  }

  function modal(type, record = {}) {
    const customerOptions = state.customers.map(customer => `<option value="${customer.id}" ${Number(customer.id) === Number(record.customer_id) ? 'selected' : ''}>${customer.name}</option>`).join('');
    const configs = {
      customer: { title: record.id ? 'Edit pelanggan' : 'Tambah pelanggan', fields: `<div class="field"><label>NAMA PASANGAN</label><input class="form-control" name="name" required value="${record.name || ''}" placeholder="Bima & Citra"></div><div class="field"><label>NOMOR KONTAK / WHATSAPP *</label><input class="form-control" name="phone" type="tel" required minlength="8" value="${record.phone || ''}" placeholder="08xx atau +62xx"><small>Gunakan nomor aktif WhatsApp, minimal 8 digit.</small></div><div class="field"><label>BANK UNTUK PENGEMBALIAN DEPOSIT *</label><input class="form-control" name="bank_name" required value="${record.bank_name || ''}" placeholder="Contoh: BCA, BRI, Mandiri"></div><div class="field"><label>NOMOR REKENING *</label><input class="form-control" name="account_number" inputmode="numeric" required value="${record.account_number || ''}" placeholder="Nomor rekening penerima"></div><div class="field"><label>EMAIL</label><input class="form-control" name="email" type="email" value="${record.email || ''}"></div><div class="field"><label>TANGGAL ACARA</label><input class="form-control" name="event_date" type="date" value="${record.event_date || ''}"></div><div class="field full"><label>VENUE</label><input class="form-control" name="venue" value="${record.venue || ''}" placeholder="Nama lokasi acara"></div>`, submit: payload => record.id ? window.api(`/api/customers/${record.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : window.api('/api/customers', { method: 'POST', body: JSON.stringify(payload) }) },
      invoice: { title: 'Buat kontrak / catat piutang', fields: `<div class="field full"><label>PELANGGAN</label><select class="form-control" name="customer_id" required>${customerOptions}</select></div><div class="field full"><label>JENIS JASA RESMI</label><select class="form-control" id="service-type" name="service_type" required>${services.map(service => `<option value="${service.name}">${service.name} · ${money(service.min)}–${money(service.max)}</option>`).join('')}</select></div><div class="field"><label>HARGA JASA</label><input class="form-control" id="service-amount" name="service_amount" type="number" min="${services[0].min}" max="${services[0].max}" step="500000" value="${services[0].min}" required><small id="service-range">Kisaran: ${money(services[0].min)} – ${money(services[0].max)}</small></div><div class="field"><label>ZONA LOKASI ACARA</label><select class="form-control" id="location-zone" name="location_zone" required>${zones.map(zone => `<option value="${zone.name}">${zone.name} · fee ${money(zone.fee)}</option>`).join('')}</select></div><div class="field full"><label>CATATAN KONTRAK (OPSIONAL)</label><input class="form-control" name="description" placeholder="Paket / catatan tambahan"></div><div class="field full"><div class="invoice-breakdown"><span>Harga jasa <strong id="breakdown-service">${money(services[0].min)}</strong></span><span>Fee wilayah <strong id="breakdown-fee">${money(zones[0].fee)}</strong></span><span class="invoice-grand-total">Total tagihan <strong id="breakdown-total">${money(services[0].min)}</strong></span></div></div><div class="field"><label>JATUH TEMPO</label><input class="form-control" name="due_date" type="date" required></div><div class="field"><label>PEMBAYARAN AWAL</label><input class="form-control" name="paid_amount" type="number" min="0" value="0"></div>`, submit: payload => window.api('/api/invoices', { method: 'POST', body: JSON.stringify(payload) }) },
      deposit: { title: 'Catat smart deposit', fields: `<div class="field full"><label>PELANGGAN</label><select class="form-control" name="customer_id" required>${customerOptions}</select></div><div class="field"><label>NOMINAL DEPOSIT</label><input class="form-control" name="amount" type="number" min="1" required></div><div class="field full"><label>CATATAN</label><input class="form-control" name="notes" placeholder="Jaminan properti dekorasi"></div>`, submit: payload => window.api('/api/deposits', { method: 'POST', body: JSON.stringify(payload) }) },
      damage: { title: 'Catat aset rusak / hilang', fields: `<p class="form-hint full">Saldo deposit tersedia: <strong>${money(record.remaining)}</strong>. Total potongan akan dihitung otomatis.</p><div class="field full"><label>NAMA BARANG</label><input class="form-control" name="item_name" required placeholder="Contoh: vas kaca tinggi"></div><div class="field"><label>JUMLAH</label><input class="form-control" name="quantity" type="number" min="1" value="1" required></div><div class="field"><label>BIAYA GANTI RUGI / UNIT</label><input class="form-control" name="replacement_cost" type="number" min="1" required></div><div class="field full"><label>TOTAL POTONGAN</label><output class="damage-total" id="damage-total">Rp 0</output></div>`, submit: payload => window.api(`/api/deposits/${record.id}/damage`, { method: 'POST', body: JSON.stringify(payload) }) },
      payment: { title: 'Catat pembayaran piutang', fields: `<p class="form-hint full">Invoice ${record.invoice_number}; sisa tagihan ${money(record.remaining)}.</p><div class="field full"><label>NOMINAL DITERIMA</label><input class="form-control" name="paid_amount" type="number" min="1" max="${record.remaining}" required></div>`, submit: payload => window.api(`/api/invoices/${record.id}/pay`, { method: 'POST', body: JSON.stringify(payload) }) },
      return: { title: 'Kembalikan sisa deposit', fields: `<p class="form-hint full">Sisa setelah potongan kerusakan: <strong>${money(record.remaining)}</strong>.</p><p class="bank-destination full"><strong>Rekening tujuan transfer</strong><span>${record.bank_name || 'Bank belum diisi'}</span><span>${record.account_number || 'Nomor rekening belum diisi'}</span></p><div class="field full"><label>NOMINAL DIKEMBALIKAN</label><input class="form-control" name="returned_amount" type="number" min="1" max="${record.remaining}" value="${record.remaining}" required></div>`, submit: payload => window.api(`/api/deposits/${record.id}/return`, { method: 'POST', body: JSON.stringify(payload) }) },
      admin: { title: 'Admin yang bertugas', fields: `<div class="field full"><label>NAMA ADMIN</label><input class="form-control" name="admin_name" required maxlength="80" value="${activeAdmin}"></div><p class="form-hint full">Nama ini disimpan bersama setiap piutang, penagihan, dan transaksi deposit berikutnya.</p>`, submit: payload => window.api('/api/settings', { method: 'POST', body: JSON.stringify(payload) }) }
    };
    configs.invoice = {
      title: 'Buat kontrak / catat piutang',
      fields: `<div class="field full"><label>PELANGGAN</label><select class="form-control" name="customer_id" required>${customerOptions}</select></div><div class="field full"><span class="field-label">PILIH JENIS JASA</span><div class="service-card-grid" id="service-card-grid">${services.map(service => `<button type="button" class="service-card" data-service="${service.name}" aria-pressed="false"><span class="service-check" aria-hidden="true">✓</span><strong>${service.name}</strong><small>Harga standar ${money(service.standard)}</small></button>`).join('')}</div><small class="service-hint">Klik satu atau beberapa layanan. Harga standar memakai titik tengah kisaran resmi.</small></div><div class="field"><label>ZONA LOKASI ACARA</label><select class="form-control" id="location-zone" name="location_zone" required>${zones.map(zone => `<option value="${zone.name}">${zone.name} · fee ${money(zone.fee)}</option>`).join('')}</select></div><div class="field"><label>JATUH TEMPO</label><input class="form-control" name="due_date" type="date" required></div><div class="field full"><label>CATATAN KONTRAK (OPSIONAL)</label><input class="form-control" name="description" placeholder="Catatan tambahan"></div><div class="field full"><div class="invoice-breakdown"><span>Layanan terpilih <strong id="breakdown-count">0 jasa</strong></span><span>Subtotal jasa <strong id="breakdown-service">${money(0)}</strong></span><span>Fee wilayah <strong id="breakdown-fee">${money(zones[0].fee)}</strong></span><span class="invoice-grand-total">Total tagihan <strong id="breakdown-total">${money(zones[0].fee)}</strong></span></div></div><div class="field full"><label>PEMBAYARAN AWAL</label><input class="form-control" name="paid_amount" type="number" min="0" value="0"></div>`,
      submit: payload => window.api('/api/invoices', { method: 'POST', body: JSON.stringify(payload) })
    };
    const config = configs[type];
    if (!config) return;
    document.getElementById('modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><form class="modal" id="feature-form"><h2>${config.title}</h2><div class="form-grid">${config.fields}</div><div class="modal-actions"><button type="button" class="secondary-btn" data-close-modal>Batalkan</button><button class="primary-btn" type="submit">Simpan</button></div></form></div>`);
    const backdrop = document.getElementById('modal');
    backdrop.querySelector('[data-close-modal]').onclick = () => backdrop.remove();
    backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.remove(); });
    const form = document.getElementById('feature-form');
    if (['invoice', 'deposit', 'damage', 'payment', 'return'].includes(type) || (type === 'customer' && !record.id)) {
      form.querySelector('.form-grid').insertAdjacentHTML('beforeend', `<div class="field full"><label>TANGGAL PENCATATAN</label><input class="form-control" name="recorded_at" type="date" value="${todayISO()}" required></div>`);
    }
    if (type === 'invoice') {
      const zoneSelect = form.querySelector('#location-zone');
      const updateInvoiceTotal = () => {
        const selectedServices = [...form.querySelectorAll('.service-card.is-selected')].map(card => services.find(service => service.name === card.dataset.service));
        const zone = zones.find(item => item.name === zoneSelect.value);
        const amount = selectedServices.reduce((sum, service) => sum + service.standard, 0);
        document.getElementById('breakdown-count').textContent = `${selectedServices.length} jasa`;
        document.getElementById('breakdown-service').textContent = money(amount);
        document.getElementById('breakdown-fee').textContent = money(zone.fee);
        document.getElementById('breakdown-total').textContent = money(amount + zone.fee);
        form.querySelector('[name="paid_amount"]').max = amount + zone.fee;
      };
      form.querySelector('#service-card-grid').addEventListener('click', event => {
        const card = event.target.closest('.service-card');
        if (!card) return;
        card.classList.toggle('is-selected');
        card.setAttribute('aria-pressed', String(card.classList.contains('is-selected')));
        updateInvoiceTotal();
      });
      form.addEventListener('change', updateInvoiceTotal);
      updateInvoiceTotal();
    }
    if (type === 'damage') {
      const updateTotal = () => { const values = new FormData(form); document.getElementById('damage-total').textContent = money(Number(values.get('quantity') || 0) * Number(values.get('replacement_cost') || 0)); };
      form.addEventListener('input', updateTotal);
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const formValues = Object.fromEntries(new FormData(form));
      if (type === 'invoice') formValues.service_types = [...form.querySelectorAll('.service-card.is-selected')].map(card => card.dataset.service);
      const payload = type === 'admin' ? formValues : actorPayload(formValues);
      ['customer_id', 'amount', 'paid_amount', 'returned_amount', 'quantity', 'replacement_cost', 'total_amount'].forEach(key => { if (payload[key] !== undefined) payload[key] = Number(payload[key]); });
      try {
        if (type === 'admin') {
          activeAdmin = payload.admin_name.trim();
          payload.admin_name = activeAdmin;
          localStorage.setItem('varapay-admin-name', activeAdmin);
        }
        await config.submit(payload);
        backdrop.remove();
        showFeatureToast(type === 'admin' ? 'Nama admin diperbarui.' : 'Data berhasil disimpan.');
        await refreshData();
      } catch (error) {
        showFeatureToast(error.message);
      }
    };
  }

  function showFeatureToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  async function deleteRecord(path, message) {
    if (!window.confirm(message)) return;
    try {
      await window.api(path, { method: 'DELETE' });
      showFeatureToast('Data berhasil dihapus.');
      await refreshData();
    } catch (error) {
      showFeatureToast(error.message);
    }
  }

  window.renderOverview = renderOverview;
  window.renderReceivables = renderReceivables;
  window.renderDeposits = renderDeposits;
  window.renderCustomers = renderCustomers;
  window.modal = modal;
  window.render = () => {
    pageTitle.textContent = titles[state.view] || titles.overview;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.view));
    if (state.view === 'overview') renderOverview();
    if (state.view === 'receivables') renderReceivables();
    if (state.view === 'deposits') renderDeposits();
    if (state.view === 'customers') renderCustomers();
  };
  window.loadData = refreshData;

  document.addEventListener('click', event => {
    const nav = event.target.closest('.nav-item');
    if (nav) { event.preventDefault(); event.stopImmediatePropagation(); state.view = nav.dataset.view; window.render(); return; }
    const action = event.target.closest('[data-action]');
    if (action) { event.preventDefault(); event.stopImmediatePropagation(); window.modal(action.dataset.action); return; }
    const admin = event.target.closest('#admin-settings');
    if (admin) { event.preventDefault(); event.stopImmediatePropagation(); modal('admin'); return; }
    const deleteCustomer = event.target.closest('[data-delete-customer]');
    if (deleteCustomer) { event.preventDefault(); event.stopImmediatePropagation(); deleteRecord(`/api/customers/${deleteCustomer.dataset.deleteCustomer}`, 'Hapus pelanggan ini beserta piutang, deposit, dan riwayat transaksinya?'); return; }
    const deleteInvoice = event.target.closest('[data-delete-invoice]');
    if (deleteInvoice) { event.preventDefault(); event.stopImmediatePropagation(); deleteRecord(`/api/invoices/${deleteInvoice.dataset.deleteInvoice}`, 'Hapus data piutang dan riwayat pembayarannya?'); return; }
    const deleteDeposit = event.target.closest('[data-delete-deposit]');
    if (deleteDeposit) { event.preventDefault(); event.stopImmediatePropagation(); deleteRecord(`/api/deposits/${deleteDeposit.dataset.deleteDeposit}`, 'Hapus deposit, rincian kerusakan, dan riwayat pengembaliannya?'); return; }
    const edit = event.target.closest('[data-edit-customer]');
    if (edit) { event.preventDefault(); event.stopImmediatePropagation(); modal('customer', state.customers.find(item => Number(item.id) === Number(edit.dataset.editCustomer))); return; }
    const damage = event.target.closest('[data-damage]');
    if (damage) { event.preventDefault(); event.stopImmediatePropagation(); modal('damage', { id: damage.dataset.damage, remaining: Number(damage.dataset.remaining) }); return; }
    const payment = event.target.closest('[data-pay]');
    if (payment) { event.preventDefault(); event.stopImmediatePropagation(); const invoice = state.dashboard.invoices.find(item => Number(item.id) === Number(payment.dataset.pay)); modal('payment', { ...invoice, remaining: Number(invoice.total_amount) - Number(invoice.paid_amount) }); return; }
    const returnDeposit = event.target.closest('[data-return]');
    if (returnDeposit) { event.preventDefault(); event.stopImmediatePropagation(); const deposit = state.dashboard.deposits.find(item => Number(item.id) === Number(returnDeposit.dataset.return)); modal('return', { ...deposit, remaining: Number(returnDeposit.dataset.remaining) }); }
  }, true);

  document.getElementById('refresh-btn').onclick = refreshData;
  document.getElementById('today').textContent = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  updateAdminDisplay();
  refreshData().catch(error => {
    document.getElementById('app-view').innerHTML = `<div class="empty">Data belum bisa dimuat: ${error.message}</div>`;
  });
})();
