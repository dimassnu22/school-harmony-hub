
## Sistem Manajemen Kegiatan Sekolah

Web app untuk kelola absensi, jadwal, dan kalender pendidikan dengan tampilan modern berwarna.

### Peran & Akses
- **Admin** — kelola semua data: pengguna, kelas, mapel, jadwal, kalender, laporan
- **Guru** — input absen siswa per kelas/jam, lihat jadwal mengajar, absen mandiri (clock-in)
- **Staff** — kelola data administratif (kelas, mapel, jadwal, kalender) sesuai izin admin
- **Orang Tua** — pantau absensi & jadwal anak (read-only), lihat kalender & pengumuman

Login via email + password. Role disimpan di tabel terpisah (aman dari privilege escalation). Orang tua dihubungkan ke siswa lewat relasi `parent_student`.

### Modul Utama

**1. Dashboard** (per role)
- Admin/Staff: ringkasan kehadiran hari ini, jumlah guru hadir, agenda terdekat
- Guru: jadwal mengajar hari ini, kelas yang belum diabsen
- Orang tua: status kehadiran anak hari ini, jadwal anak, agenda mendatang

**2. Manajemen Data** (admin/staff)
- CRUD Siswa, Guru, Kelas (mis. X-IPA-1), Mata Pelajaran
- Penugasan siswa ke kelas, guru pengampu mapel
- Relasi orang tua ↔ siswa

**3. Absensi Siswa** (manual oleh guru)
- Guru pilih kelas & jam pelajaran → daftar siswa muncul
- Tandai: Hadir / Izin / Sakit / Alpha + catatan opsional
- Submit & kunci, bisa diedit dengan catatan revisi

**4. Absensi Guru/Staff** (manual)
- Guru clock-in/clock-out harian, atau diinput admin
- Status: Hadir / Izin / Sakit / Dinas Luar / Alpha

**5. Jadwal Pelajaran**
- Grid mingguan per kelas (hari × jam)
- Admin susun jadwal: pilih kelas, hari, jam, mapel, guru, ruang
- Validasi konflik (guru/kelas bentrok)
- Guru lihat jadwal mengajar, ortu lihat jadwal anak

**6. Kalender Pendidikan**
- Tampilan bulanan + daftar agenda
- Event: hari libur, ujian, rapat, kegiatan sekolah, dll. (warna per kategori)
- Admin/staff CRUD; semua role melihat

**7. Laporan & Rekap**
- Rekap absensi per siswa / kelas / periode
- Rekap absensi guru per periode
- Persentase kehadiran, ringkasan I/S/A
- Export ke CSV (dan PDF untuk laporan utama)

### Desain
Modern berwarna: primary biru cerah, accent hijau (hadir) / kuning (izin/sakit) / merah (alpha), kartu-kartu dengan radius lembut, ikon Lucide ramah. Sidebar collapsible untuk navigasi modul, header dengan profil & notifikasi. Fully responsive (mobile-friendly untuk guru input absen di kelas dan ortu cek di HP).

### Backend (Lovable Cloud)
- Auth email/password + tabel `profiles` (nama, no.HP, foto)
- Tabel `user_roles` terpisah (admin/guru/staff/orang_tua) dengan fungsi `has_role()` security definer
- Tabel: `students`, `teachers`, `classes`, `subjects`, `class_students`, `parent_student`, `schedules`, `student_attendance`, `teacher_attendance`, `calendar_events`
- RLS ketat: ortu hanya lihat data anaknya; guru hanya kelas yang diampu; admin/staff penuh

### Pendekatan Bertahap
Karena cakupannya besar, saya bangun **Tahap 1** dulu: autentikasi + role + manajemen data dasar (siswa/guru/kelas/mapel) + dashboard kerangka. Tahap berikutnya: jadwal → absensi → kalender → laporan. Setiap tahap bisa Anda uji sebelum lanjut.
