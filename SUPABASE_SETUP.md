# Supabase Setup — Panen Cerdas

Wajib dijalankan sekali oleh setiap developer / sebelum deploy.

Supabase dipakai untuk **dua peran**:
1. **Auth** — email + password + role di tabel `profiles` (frontend).
2. **Database produksi** — Postgres untuk `prediction_log` / `training_feedback` / `model_version` (ml_service). Sebelumnya SQLite per-device, sekarang shared cloud supaya lahan & history petani konsisten antar device.

## 1. Bikin project

1. Buka https://supabase.com → **New project**.
2. Name: `panen-cerdas` (atau bebas).
3. Database password: simpan di password manager (tidak dipakai langsung di kode).
4. Region: **Singapore (Southeast Asia)** untuk latency terbaik dari Indonesia.
5. Tunggu ~2 menit sampai provisioning selesai.

## 2. Disable email confirmation (penting untuk demo)

1. Sidebar → **Authentication** → **Providers** → **Email**.
2. Matikan toggle **"Confirm email"**.
3. Klik **Save**.

Tanpa langkah ini, register stuck di "check your email".

## 3. Bikin tabel `profiles`

Sidebar → **SQL Editor** → **New query** → paste seluruh SQL ini → **Run**.

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role text not null check (role in ('petani', 'pemerintah')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

Verifikasi: Sidebar → **Table Editor** → harus muncul `profiles` dengan 4 kolom.

## 3b. Kode akses instansi (gating peran pemerintah)

Supaya **tidak sembarang orang bisa daftar sebagai pemerintah**, peran pemerintah
butuh **kode akses instansi**. Saat register, kalau user pilih kartu "Pemerintah",
muncul field kode; `signUp()` memvalidasinya lewat fungsi RPC `verify_gov_code`
sebelum akun dibuat. Petani tidak terpengaruh (tidak perlu kode).

Kode disimpan di tabel `gov_access_codes` yang **RLS-nya tidak punya policy SELECT**,
jadi isi tabel tak bisa dibaca dari browser (anon key). Validasi memakai fungsi
`SECURITY DEFINER` yang hanya mengembalikan `true/false` — kode rahasia tidak pernah
dikirim ke client / ikut ter-bundle ke JS.

Sidebar → **SQL Editor** → **New query** → paste → **Run**:

```sql
-- Tabel kode akses instansi pemerintah
create table public.gov_access_codes (
  code       text primary key,
  label      text,                       -- nama instansi / keterangan
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

-- RLS aktif TANPA policy SELECT untuk anon -> isi tabel tak terbaca dari client.
alter table public.gov_access_codes enable row level security;

-- Validasi kode tanpa membocorkan isi tabel (SECURITY DEFINER bypass RLS).
create or replace function public.verify_gov_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gov_access_codes
    where code = p_code and is_active = true
  );
$$;

grant execute on function public.verify_gov_code(text) to anon, authenticated;

-- Seed contoh kode (GANTI dengan kode rahasia kamu sendiri).
insert into public.gov_access_codes (code, label)
values ('PANEN-GOV-2026', 'Demo UNITY / instansi pilot');
```

Verifikasi: Sidebar → **Table Editor** → `gov_access_codes` harus muncul dengan
minimal 1 baris aktif.

### Cara admin mengelola kode

Lewat **SQL Editor** (atau Table Editor):

```sql
-- Tambah kode baru untuk satu instansi
insert into public.gov_access_codes (code, label)
values ('DIY-DISTAN-01', 'Dinas Pertanian DIY');

-- Nonaktifkan kode (tanpa menghapus) -> register pemerintah dgn kode ini ditolak
update public.gov_access_codes set is_active = false where code = 'DIY-DISTAN-01';
```

### Alur komunikasi admin ↔ instansi (out-of-band)

Akun pemerintah tetap dibuat sendiri oleh instansi lewat halaman `/register`, tapi
**hanya pemegang kode** yang bisa membuatnya sebagai pemerintah. Kode dibagikan
**di luar sistem** oleh tim/admin PanenCerdas ke instansi yang sah — mis. lewat email
resmi atau saat onboarding. Instansi yang belum punya kode diarahkan oleh prompt di
form register: *"Belum punya kode akses instansi? Hubungi kami"* → halaman
`/hubungi-kami`. Untuk demo (juri UNITY), bagikan kode seed `PANEN-GOV-2026`.

## 4. Copy kredensial ke frontend

Sidebar → **Project Settings** → **API**.

Buat file `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

- `NEXT_PUBLIC_SUPABASE_URL` → field **Project URL**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → field **anon public** (bukan service_role!).

`anon` key aman dipublikasikan karena RLS yang melindungi data — jangan pernah commit `service_role` key.

## 5. Test lokal

```powershell
cd frontend
npm run dev
```

Buka http://localhost:3000/register → daftar akun baru → otomatis redirect ke dashboard.
Buka **Authentication** → **Users** di Supabase: user baru harus muncul.
Buka **Table Editor** → `profiles`: row baru harus muncul dengan role yang dipilih.

## 6. Sambungkan ml_service ke Supabase Postgres

ML service (`ml_service/`) menulis prediksi & feedback ke Postgres yang sama supaya
lahan petani konsisten antar device. Tabel `prediction_log`, `training_feedback`,
`model_version` dibuat otomatis lewat SQLAlchemy `init_db()` saat startup.

### 6.1 Ambil connection string

Sidebar Supabase → **Project Settings** → **Database** → **Connection string** → tab **URI**.

Bentuknya:
```
postgresql://postgres:[YOUR-PASSWORD]@db.YOUR-PROJECT-REF.supabase.co:5432/postgres
```

Ganti `[YOUR-PASSWORD]` dengan **database password** (bukan anon key) yang Anda set
saat create project. Lupa? Reset di **Project Settings → Database → Database password**.

### 6.2 Paste ke `ml_service/.env`

```
DATABASE_URL=postgresql://postgres:PASSWORD_DARI_SUPABASE@db.YOUR-PROJECT-REF.supabase.co:5432/postgres
```

Kalau koneksi langsung di-block (jaringan kampus/kantor), pakai **connection pooler** (port 5432 session mode):

```
DATABASE_URL=postgresql://postgres.YOUR-PROJECT-REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 6.3 Install driver Postgres

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r ml_service\requirements.txt
```

(`psycopg2-binary` sudah ditambahkan ke requirements.)

### 6.4 Init tabel + test koneksi

```powershell
cd ml_service
python -c "from database import init_db; init_db()"
```

Kalau muncul `Database & tabel siap`, koneksi sukses. Verifikasi di Supabase
**Table Editor** → harus muncul tabel baru: `prediction_log`, `training_feedback`,
`model_version` (plus tabel cache yang dibuat oleh `data_cache.py`).

### 6.5 Catatan FK ke auth.users

Kolom `petani_id` di `prediction_log` dan `training_feedback` di-FK-kan ke
`auth.users(id)` dengan `ON DELETE SET NULL`. Artinya:
- Petani yang sudah login → `petani_id` = UUID Supabase → tersimpan rapi.
- Predict tanpa login (legacy `"demo"` / `"petani_xxx"`) → di-coerce ke `NULL`
  (lihat `database.py:normalize_petani_id`) supaya tidak error FK.
- Hapus user di Supabase → kolom `petani_id` di history-nya jadi `NULL`
  (data prediksi tidak ikut terhapus).

## 7. Deploy

Saat deploy frontend (Vercel/Netlify), tambahkan kedua env var di dashboard hosting:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Saat deploy ml_service (Render/Railway/Fly), tambahkan:
- `DATABASE_URL` (Supabase Postgres)
- `APPEEARS_USER` / `APPEEARS_PASS`

Frontend (`anon` key) cuma punya akses RLS-controlled — aman dipublikasikan.
ML service connect ke Postgres sebagai `postgres` user (bypass RLS karena
backend dipercaya); pastikan `DATABASE_URL` **tidak pernah** masuk ke env
publik / dikirim ke browser.
