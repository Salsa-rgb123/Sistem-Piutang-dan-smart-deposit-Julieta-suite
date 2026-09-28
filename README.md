# Julieta Suite

Sistem piutang, penagihan, dan smart deposit untuk **Julieta Event & Décor**. Aplikasi demo langsung membuka dashboard tanpa login dan menyimpan data di browser.

## Menjalankan aplikasi

Repository ini memakai GitHub Actions untuk menerbitkan folder `frontend/` ke GitHub Pages. Di GitHub, buka **Settings > Pages**, pilih **GitHub Actions** sebagai Build and deployment source, lalu jalankan workflow `Deploy Julieta Suite to GitHub Pages` dari tab **Actions** atau unggah commit baru ke branch `main`.

Buka URL Pages yang ditampilkan di **Settings > Pages**. Dashboard langsung tampil tanpa akun atau langkah login. Data contoh dan perubahan yang dibuat tersimpan di `localStorage` browser tersebut, jadi tidak dibagikan ke browser atau komputer lain. Untuk pratinjau lokal, buka `frontend/index.html`.

## Struktur

- `frontend/` - aplikasi web dan adapter Supabase.
- `backend/schema.sql` - tabel, Row Level Security, katalog, dan fungsi transaksi database Supabase.

## Fitur

- Dashboard piutang, deposit, pelanggan, dan tagihan jatuh tempo.
- Pencatatan pelanggan, invoice, pembayaran, deposit, kerusakan, serta pengembalian.
- Katalog delapan jenis jasa dan fee wilayah yang tersimpan di Supabase.
- Audit transaksi serta pencatatan admin.
- Data demo tersimpan secara lokal di browser tanpa login.
