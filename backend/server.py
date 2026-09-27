import json
import sqlite3
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(__file__).resolve().parent / "varapay.db"
FRONTEND = ROOT / "frontend"
SERVICE_CATALOG = {
    "Event Organizer (Full Service)": (15000000, 25000000, 20000000),
    "Decoration": (25000000, 65000000, 45000000),
    "Make Up Artist (MUA)": (5000000, 9000000, 7000000),
    "Wardrobe": (7500000, 18000000, 12750000),
    "Catering (500 pax)": (45000000, 90000000, 67500000),
    "Photobooth": (4000000, 7000000, 5500000),
    "MC": (3500000, 7500000, 5500000),
    "Penampilan Sanggar": (4500000, 9000000, 6750000),
}
LOCATION_ZONES = {
    "Zona 1 (Semarang & Sekitarnya)": 0,
    "Zona 2 (Jateng & Jogja)": 2500000,
    "Zona 3 (Destination Domestic - Jakarta/Bali)": 7500000,
    "Zona 4 (ASEAN / International - SG, MY, Brunei)": 25000000,
}


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_db():
    with connect_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                event_date TEXT,
                venue TEXT,
                created_at TEXT NOT NULL,
                admin_name TEXT NOT NULL DEFAULT 'Admin Julieta',
                bank_name TEXT NOT NULL DEFAULT '',
                account_number TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT NOT NULL UNIQUE,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                description TEXT NOT NULL,
                total_amount INTEGER NOT NULL,
                paid_amount INTEGER NOT NULL DEFAULT 0,
                due_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Menunggu',
                created_at TEXT NOT NULL,
                admin_name TEXT NOT NULL DEFAULT 'Admin Julieta',
                service_type TEXT NOT NULL DEFAULT '',
                service_amount INTEGER NOT NULL DEFAULT 0,
                location_zone TEXT NOT NULL DEFAULT '',
                location_fee INTEGER NOT NULL DEFAULT 0,
                services_json TEXT NOT NULL DEFAULT '[]'
            );
            CREATE TABLE IF NOT EXISTS deposits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                amount INTEGER NOT NULL,
                returned_amount INTEGER NOT NULL DEFAULT 0,
                damaged_amount INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Tersimpan',
                notes TEXT,
                deposited_at TEXT NOT NULL,
                admin_name TEXT NOT NULL DEFAULT 'Admin Julieta'
            );
            CREATE TABLE IF NOT EXISTS deposit_damages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deposit_id INTEGER NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                replacement_cost INTEGER NOT NULL,
                total_cost INTEGER NOT NULL,
                admin_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS transaction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_type TEXT NOT NULL,
                reference_id INTEGER NOT NULL,
                admin_name TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL
            );
            """
        )
        for table, column in (("customers", "admin_name"), ("customers", "bank_name"), ("customers", "account_number"), ("invoices", "admin_name"), ("invoices", "service_type"), ("invoices", "service_amount"), ("invoices", "location_zone"), ("invoices", "location_fee"), ("invoices", "services_json"), ("deposits", "damaged_amount"), ("deposits", "admin_name")):
            columns = {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}
            if column not in columns:
                default = " INTEGER NOT NULL DEFAULT 0" if column in ("damaged_amount", "service_amount", "location_fee") else " TEXT NOT NULL DEFAULT '[]'" if column == "services_json" else " TEXT NOT NULL DEFAULT ''" if column in ("service_type", "location_zone", "bank_name", "account_number") else " TEXT NOT NULL DEFAULT 'Admin Julieta'"
                db.execute(f"ALTER TABLE {table} ADD COLUMN {column}{default}")
            db.execute("INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('admin_name', 'Admin Julieta')")
            db.execute("UPDATE app_settings SET setting_value = 'Admin Julieta' WHERE setting_key = 'admin_name' AND setting_value = 'Admin VaraPay'")
        if db.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
            now = datetime.now().isoformat(timespec="seconds")
            db.execute("INSERT INTO customers (name, phone, email, event_date, venue, created_at) VALUES (?, ?, ?, ?, ?, ?)", ("Raka & Naya", "0812-7788-1100", "raka.naya@email.com", "2026-10-18", "Gedung Serbaguna Cempaka", now))
            db.execute("INSERT INTO customers (name, phone, email, event_date, venue, created_at) VALUES (?, ?, ?, ?, ?, ?)", ("Dimas & Alya", "0813-4567-2288", "dimas.alya@email.com", "2026-11-07", "Amarta Garden", now))
            db.execute("INSERT INTO customers (name, phone, email, event_date, venue, created_at) VALUES (?, ?, ?, ?, ?, ?)", ("Naufal & Sinta", "0856-9021-7788", "naufal.sinta@email.com", "2026-12-12", "Pendopo Ndalem", now))
            ids = [row[0] for row in db.execute("SELECT id FROM customers ORDER BY id").fetchall()]
            db.executemany("INSERT INTO invoices (invoice_number, customer_id, description, total_amount, paid_amount, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                ("INV-26001", ids[0], "Paket dekorasi premium", 18500000, 10000000, "2026-09-28", "Sebagian", now),
                ("INV-26002", ids[1], "Wedding organizer full day", 24000000, 0, "2026-09-25", "Menunggu", now),
                ("INV-26003", ids[2], "Dekorasi intimate + lighting", 12500000, 12500000, "2026-09-20", "Lunas", now),
            ])
            db.executemany("INSERT INTO deposits (customer_id, amount, returned_amount, status, notes, deposited_at) VALUES (?, ?, ?, ?, ?, ?)", [
                (ids[0], 5000000, 0, "Tersimpan", "Jaminan properti dekorasi", now),
                (ids[1], 4000000, 0, "Tersimpan", "Menunggu pemeriksaan venue", now),
                (ids[2], 3500000, 3500000, "Dikembalikan", "Barang diterima baik", now),
            ])


def as_dicts(rows):
    return [dict(row) for row in rows]


def add_invoice_services(invoices):
    for invoice in invoices:
        try:
            services = json.loads(invoice.get("services_json") or "[]")
        except json.JSONDecodeError:
            services = []
        if not services and invoice.get("service_type"):
            services = [{"name": invoice["service_type"], "amount": invoice.get("service_amount", 0)}]
        invoice["services"] = services
    return invoices


def json_body(handler):
    length = int(handler.headers.get("Content-Length", 0))
    return json.loads(handler.rfile.read(length) or b"{}")


def money(value):
    return int(value or 0)


def admin_name(data):
    return str(data.get("admin_name") or "Admin Julieta").strip()[:80] or "Admin Julieta"


def log_transaction(db, transaction_type, reference_id, actor, details, created_at):
    db.execute("INSERT INTO transaction_logs (transaction_type, reference_id, admin_name, details, created_at) VALUES (?, ?, ?, ?, ?)", (transaction_type, reference_id, actor, details, created_at))


def recording_timestamp(data):
    current = datetime.now()
    selected_date = data.get("recorded_at")
    if not selected_date:
        return current.isoformat(timespec="seconds")
    try:
        parsed_date = date.fromisoformat(selected_date)
    except (TypeError, ValueError) as error:
        raise ValueError("Tanggal pencatatan tidak valid") from error
    return datetime.combine(parsed_date, current.time().replace(microsecond=0)).isoformat(timespec="seconds")


class VaraPayHandler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path):
        content = path.read_bytes()
        content_type = "text/html; charset=utf-8" if path.suffix == ".html" else "text/css; charset=utf-8" if path.suffix == ".css" else "image/svg+xml" if path.suffix == ".svg" else "application/javascript; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self.send_json({"status": "ok", "service": "Julieta Suite API"})
        if parsed.path == "/api/catalog":
            return self.send_json({
                "services": [{"name": name, "min_price": prices[0], "max_price": prices[1], "standard_price": prices[2]} for name, prices in SERVICE_CATALOG.items()],
                "zones": [{"name": name, "fee": fee} for name, fee in LOCATION_ZONES.items()],
            })
        if parsed.path == "/api/dashboard":
            with connect_db() as db:
                invoices = add_invoice_services(as_dicts(db.execute("SELECT invoices.*, customers.name AS customer_name, customers.phone AS customer_phone FROM invoices JOIN customers ON customers.id = invoices.customer_id ORDER BY due_date").fetchall()))
                deposits = as_dicts(db.execute("SELECT deposits.*, customers.name AS customer_name, customers.bank_name, customers.account_number FROM deposits JOIN customers ON customers.id = deposits.customer_id ORDER BY deposited_at DESC").fetchall())
                damages = as_dicts(db.execute("SELECT deposit_damages.*, customers.name AS customer_name FROM deposit_damages JOIN deposits ON deposits.id = deposit_damages.deposit_id JOIN customers ON customers.id = deposits.customer_id ORDER BY deposit_damages.created_at DESC").fetchall())
                customers = db.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
                receivable = sum(row["total_amount"] - row["paid_amount"] for row in invoices)
                deposit_total = sum(row["amount"] - row["returned_amount"] - row["damaged_amount"] for row in deposits)
                overdue = sum(1 for row in invoices if row["due_date"] < date.today().isoformat() and row["status"] != "Lunas")
                return self.send_json({"customers": customers, "receivable": receivable, "deposit_total": deposit_total, "overdue": overdue, "invoices": invoices, "deposits": deposits, "damages": damages})
        if parsed.path == "/api/settings":
            with connect_db() as db:
                return self.send_json({row["setting_key"]: row["setting_value"] for row in db.execute("SELECT * FROM app_settings")})
        if parsed.path == "/api/transactions":
            with connect_db() as db:
                return self.send_json(as_dicts(db.execute("SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 100").fetchall()))
        if parsed.path == "/api/customers":
            with connect_db() as db:
                return self.send_json(as_dicts(db.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()))
        if parsed.path == "/api/invoices":
            with connect_db() as db:
                return self.send_json(add_invoice_services(as_dicts(db.execute("SELECT invoices.*, customers.name AS customer_name, customers.phone AS customer_phone FROM invoices JOIN customers ON customers.id = invoices.customer_id ORDER BY due_date").fetchall())))
        if parsed.path == "/api/deposits":
            with connect_db() as db:
                return self.send_json(as_dicts(db.execute("SELECT deposits.*, customers.name AS customer_name, customers.bank_name, customers.account_number FROM deposits JOIN customers ON customers.id = deposits.customer_id ORDER BY deposited_at DESC").fetchall()))
        relative = parsed.path.lstrip("/") or "index.html"
        requested = (FRONTEND / relative).resolve()
        if requested.is_file() and str(requested).startswith(str(FRONTEND.resolve())):
            return self.send_file(requested)
        return self.send_file(FRONTEND / "index.html")

    def do_POST(self):
        parsed = urlparse(self.path)
        data = json_body(self)
        actor = admin_name(data)
        try:
            now = recording_timestamp(data)
            with connect_db() as db:
                if parsed.path == "/api/customers":
                    phone = str(data["phone"]).strip()
                    if len("".join(character for character in phone if character.isdigit())) < 8:
                        raise ValueError("Nomor WhatsApp minimal 8 digit")
                    bank_name = str(data.get("bank_name", "")).strip()
                    account_number = str(data.get("account_number", "")).strip()
                    if not bank_name or not account_number:
                        raise ValueError("Nama bank dan nomor rekening wajib diisi")
                    cursor = db.execute("INSERT INTO customers (name, phone, email, event_date, venue, created_at, admin_name, bank_name, account_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (data["name"].strip(), phone, data.get("email", ""), data.get("event_date", ""), data.get("venue", ""), now, actor, bank_name, account_number))
                    log_transaction(db, "Pelanggan", cursor.lastrowid, actor, f"Tambah pelanggan {data['name']}", now)
                    return self.send_json({"id": cursor.lastrowid, "message": "Pelanggan berhasil ditambahkan"}, 201)
                if parsed.path == "/api/invoices":
                    number = data.get("invoice_number") or f"INV-{datetime.now().strftime('%y%m%d%H%M%S')}"
                    selected = data.get("service_types")
                    if selected is None:
                        selected = [data.get("service_type", "")]
                    if not isinstance(selected, list):
                        raise ValueError("Pilihan jasa tidak valid")
                    selected = list(dict.fromkeys(str(name) for name in selected))
                    if not selected or any(name not in SERVICE_CATALOG for name in selected):
                        raise ValueError("Pilih minimal satu jasa dari master Julieta Event & Décor")
                    services = [{"name": name, "amount": SERVICE_CATALOG[name][2]} for name in selected]
                    service_amount = sum(service["amount"] for service in services)
                    if data.get("service_type") and "service_types" not in data:
                        legacy_amount = money(data.get("service_amount"))
                        minimum, maximum, _ = SERVICE_CATALOG[selected[0]]
                        if legacy_amount < minimum or legacy_amount > maximum:
                            raise ValueError(f"Harga {selected[0]} harus di antara Rp{minimum:,} dan Rp{maximum:,}")
                        service_amount = legacy_amount
                        services[0]["amount"] = legacy_amount
                    location_zone = str(data.get("location_zone", ""))
                    if location_zone not in LOCATION_ZONES:
                        raise ValueError("Pilih zona lokasi acara")
                    location_fee = LOCATION_ZONES[location_zone]
                    total = service_amount + location_fee
                    paid = money(data.get("paid_amount"))
                    if total <= 0 or paid < 0 or paid > total:
                        raise ValueError("Nominal piutang atau pembayaran tidak valid")
                    status = "Lunas" if paid >= total else "Sebagian" if paid > 0 else "Menunggu"
                    service_names = [service["name"] for service in services]
                    service_type = ", ".join(service_names)
                    description = data.get("description") or service_type
                    services_json = json.dumps(services, ensure_ascii=False)
                    cursor = db.execute("INSERT INTO invoices (invoice_number, customer_id, description, total_amount, paid_amount, due_date, status, created_at, admin_name, service_type, service_amount, location_zone, location_fee, services_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (number, data["customer_id"], description, total, paid, data["due_date"], status, now, actor, service_type, service_amount, location_zone, location_fee, services_json))
                    log_transaction(db, "Piutang", cursor.lastrowid, actor, f"Catat {number}: jasa Rp{service_amount} + fee {location_zone} Rp{location_fee} = Rp{total}", now)
                    return self.send_json({"id": cursor.lastrowid, "message": "Piutang berhasil dicatat"}, 201)
                if parsed.path == "/api/deposits":
                    amount = money(data["amount"])
                    if amount <= 0:
                        raise ValueError("Nominal deposit harus lebih dari nol")
                    cursor = db.execute("INSERT INTO deposits (customer_id, amount, notes, deposited_at, admin_name) VALUES (?, ?, ?, ?, ?)", (data["customer_id"], amount, data.get("notes", ""), now, actor))
                    log_transaction(db, "Deposit", cursor.lastrowid, actor, f"Setor deposit sebesar Rp{amount}", now)
                    return self.send_json({"id": cursor.lastrowid, "message": "Smart deposit berhasil disimpan"}, 201)
                if parsed.path == "/api/settings":
                    db.execute("INSERT INTO app_settings (setting_key, setting_value) VALUES ('admin_name', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value", (actor,))
                    return self.send_json({"admin_name": actor})
                if parsed.path.startswith("/api/invoices/") and parsed.path.endswith("/pay"):
                    invoice_id = int(parsed.path.split("/")[3])
                    paid = money(data["paid_amount"])
                    invoice = db.execute("SELECT invoice_number, total_amount, paid_amount FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
                    if not invoice or paid <= 0 or invoice["paid_amount"] + paid > invoice["total_amount"]:
                        raise ValueError("Pembayaran tidak valid atau melebihi sisa tagihan")
                    db.execute("UPDATE invoices SET paid_amount = paid_amount + ?, status = CASE WHEN paid_amount + ? >= total_amount THEN 'Lunas' ELSE 'Sebagian' END, admin_name = ? WHERE id = ?", (paid, paid, actor, invoice_id))
                    log_transaction(db, "Penagihan", invoice_id, actor, f"Pembayaran {invoice['invoice_number']} sebesar Rp{paid}", now)
                    return self.send_json({"message": "Pembayaran berhasil dicatat"})
                if parsed.path.startswith("/api/deposits/") and parsed.path.endswith("/damage"):
                    deposit_id = int(parsed.path.split("/")[3])
                    quantity = int(data["quantity"])
                    replacement_cost = money(data["replacement_cost"])
                    total_cost = quantity * replacement_cost
                    deposit = db.execute("SELECT amount, returned_amount, damaged_amount FROM deposits WHERE id = ?", (deposit_id,)).fetchone()
                    if not deposit or quantity <= 0 or replacement_cost <= 0 or deposit["returned_amount"] + deposit["damaged_amount"] + total_cost > deposit["amount"]:
                        raise ValueError("Potongan kerusakan melebihi sisa deposit")
                    db.execute("INSERT INTO deposit_damages (deposit_id, item_name, quantity, replacement_cost, total_cost, admin_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (deposit_id, data["item_name"].strip(), quantity, replacement_cost, total_cost, actor, now))
                    db.execute("UPDATE deposits SET damaged_amount = damaged_amount + ?, status = 'Dipotong Kerusakan', admin_name = ? WHERE id = ?", (total_cost, actor, deposit_id))
                    log_transaction(db, "Potongan kerusakan", deposit_id, actor, f"{data['item_name']} x{quantity}, potongan Rp{total_cost}", now)
                    return self.send_json({"message": "Rincian kerusakan dan potongan deposit berhasil disimpan"}, 201)
                if parsed.path.startswith("/api/deposits/") and parsed.path.endswith("/return"):
                    deposit_id = int(parsed.path.split("/")[3])
                    returned = money(data.get("returned_amount"))
                    deposit = db.execute("SELECT amount, returned_amount, damaged_amount FROM deposits WHERE id = ?", (deposit_id,)).fetchone()
                    if not deposit or returned <= 0 or deposit["returned_amount"] + deposit["damaged_amount"] + returned > deposit["amount"]:
                        raise ValueError("Nominal pengembalian melebihi sisa deposit")
                    remaining = deposit["amount"] - deposit["returned_amount"] - deposit["damaged_amount"] - returned
                    status = "Dikembalikan" if remaining == 0 and deposit["damaged_amount"] == 0 else "Dipotong Kerusakan" if deposit["damaged_amount"] else "Dikembalikan Sebagian"
                    db.execute("UPDATE deposits SET returned_amount = returned_amount + ?, status = ?, admin_name = ? WHERE id = ?", (returned, status, actor, deposit_id))
                    log_transaction(db, "Pengembalian deposit", deposit_id, actor, f"Pengembalian sebesar Rp{returned}", now)
                    return self.send_json({"message": "Deposit berhasil diproses"})
        except (KeyError, ValueError, sqlite3.IntegrityError) as error:
            return self.send_json({"error": str(error)}, 400)
        return self.send_json({"error": "Endpoint tidak ditemukan"}, 404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        data = json_body(self)
        if parsed.path.startswith("/api/customers/"):
            customer_id = int(parsed.path.split("/")[3])
            phone = str(data.get("phone", "")).strip()
            bank_name = str(data.get("bank_name", "")).strip()
            account_number = str(data.get("account_number", "")).strip()
            if len("".join(character for character in phone if character.isdigit())) < 8:
                return self.send_json({"error": "Nomor WhatsApp minimal 8 digit"}, 400)
            if not bank_name or not account_number:
                return self.send_json({"error": "Nama bank dan nomor rekening wajib diisi"}, 400)
            with connect_db() as db:
                db.execute("UPDATE customers SET name = ?, phone = ?, email = ?, event_date = ?, venue = ?, bank_name = ?, account_number = ? WHERE id = ?", (data["name"].strip(), phone, data.get("email", ""), data.get("event_date", ""), data.get("venue", ""), bank_name, account_number, customer_id))
                return self.send_json({"message": "Data pelanggan berhasil diperbarui"})
        return self.send_json({"error": "Endpoint tidak ditemukan"}, 404)

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


if __name__ == "__main__":
    initialize_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), VaraPayHandler)
    print("Julieta Suite berjalan di http://127.0.0.1:8000")
    print(f"Database SQLite: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nJulieta Suite dihentikan.")
        server.server_close()
