# Motion Studio

Motion Studio memutar dan mengekspor cerita 3D dari JSON v1. Preview dan ekspor memakai komposisi Remotion yang sama. Three.js menggambar setiap frame, lalu WebCodecs mengenkode video H.264 ke MP4 di browser. Studio membuka kembali proyek lokal terakhir. Pada kunjungan pertama, demo robot **Orbit 01** tersedia selama 5 detik pada 30 FPS.

## Setup dan pemeriksaan lokal

Gunakan Node.js 24 LTS dan npm. Jalankan perintah dari root proyek. Jika PowerShell memblokir skrip npm, gunakan `npm.cmd` dan `npx.cmd`.

```sh
npm ci
npm run dev
```

Buka URL loopback yang dicetak Vite. Putar **Orbit 01** dan geser posisi frame untuk memeriksa preview. Untuk QA, jalankan perintah berikut.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`typecheck` memeriksa TypeScript, `lint` menjalankan ESLint, dan `test` menjalankan Vitest sekali. `build` menghasilkan `dist/`. `preview` menyajikan build produksi untuk pemeriksaan lokal. Buka URL preview yang dicetak Vite, lalu coba **Ekspor → Ekspor MP4 → Unduh MP4**. [Dokumentasi Vite](https://vite.dev/guide/static-deploy.html)

Jalankan `npm run test:e2e` setelah build. Playwright memakai Chrome desktop yang terpasang serta menjalankan `npm run preview` di `127.0.0.1:4173` jika server belum aktif. Untuk memakai Chromium Playwright, jalankan `npx playwright install chromium` dan set `MOTION_BROWSER=chromium` sebelum menjalankan tes. Uji browser melaporkan skip beserta alasan saat WebGL2 atau encoder yang diperlukan absen.

## Buat, simpan, dan ekspor cerita

1. Pilih **Proyek → Proyek baru** untuk membuat proyek dengan satu scene awal. Di tab **Story**, tekan **Copy AI Guide** dan tempel panduan di ChatGPT bersama brief cerita. Tempel hasil JSON ke editor dan tekan **Terapkan JSON**. **Impor file** memvalidasi dan langsung menerapkan file `.json` ke proyek aktif. Bila sedang membuka **Orbit 01**, impor valid membuat proyek baru. Jika ada kesalahan, tekan **Salin kesalahan** untuk menyalin nomor scene dan path. Cerita aktif tetap dapat diputar.
2. Di **Story → Muat demo**, pilih **Robot dan Kristal** untuk cerita tiga scene berdurasi 15 detik, **Laboratorium Gerak** untuk demo preset isometrik enam detik, atau **demo JSON** untuk contoh primitive **Observatorium Prisma**. Pilihan ini mengisi editor. Tekan **Terapkan JSON** untuk memperbarui proyek aktif. **Gunakan Orbit 01** membuka kembali demo awal dari menu yang sama.
3. Buka tab **Scenes** dan pilih nama scene untuk memindahkan preview ke awal scene. Geser posisi frame untuk memeriksa gerakan dan caption.
4. Tunggu status **Tersimpan lokal** sebelum memuat ulang halaman. Buka **Proyek** untuk memilih proyek tersimpan, mengganti nama, menduplikat, menghapus dengan konfirmasi, atau **Ekspor JSON**. Jika penyimpanan penuh, unduh JSON sebagai cadangan, kosongkan ruang, lalu pilih **Coba simpan lagi**.
5. Untuk menambahkan suara, buka tab **Audio** pada proyek tersimpan dan pilih MP3 atau WAV untuk slot **Narasi** dan **Musik**. Setiap slot menerima satu file hingga 25 MiB. Atur frame mulai dari awal proyek dan volume, lalu tekan **Simpan pengaturan** pada slot tersebut. Geser posisi preview atau pilih scene, lalu tekan **Putar preview** untuk memeriksa sinkronisasi. Track bisa diganti atau dihapus dan otomatis berakhir pada frame terakhir proyek.
6. Buka **Ekspor** dan pilih **720p** (default), **540p**, atau **1080p** jika didukung. Dimensi mengikuti rasio cerita (9:16, 16:9, atau 1:1), dengan FPS 24 atau 30 sesuai timeline. Tekan **Ekspor MP4**, lalu **Unduh MP4**. Ekspor dengan lampiran memakai AAC. Jika AAC gagal, centang **Ekspor tanpa audio** untuk membuat MP4 senyap. Detail hasil terakhir menampilkan ukuran file, waktu, throughput, dan preferensi encoder.

Impor menerima hingga 1 MiB UTF-8, maksimal 12 scene dan 60 detik. Proyek tersimpan di IndexedDB untuk browser, profil, dan alamat situs yang digunakan. Menghapus data situs dapat menghapus proyek. Cadangan JSON hanya berisi cerita, tanpa audio. [AI Guide](public/ai-guide.md) · [Kontrak JSON](PRD.md#7-kontrak-json-v1-sumber-kebenaran) · [Robot dan Kristal](example-story.json) · [Laboratorium Gerak](src/examples/isometric-story.json) · [Observatorium Prisma](src/examples/primitive-story.json)

## Deploy ke Cloudflare Pages

Cloudflare Pages menyajikan berkas statis dari `dist/` melalui HTTPS. Node.js dipakai untuk build dan pengujian, sedangkan ekspor video berlangsung di browser. Git integration adalah jalur utama proyek. Untuk proyek baru yang dikelola dengan unggahan manual, pilih Direct Upload. [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

### Git integration

1. Pastikan source release dan `package-lock.json` sudah ada di branch `main` pada repo GitHub yang terhubung.
2. Di dashboard Cloudflare buka **Workers & Pages**, lalu pilih **Create application → Pages → Connect to Git**. Pilih **GitHub**, beri Cloudflare Pages akses ke repo `motion-studio`, pilih repo itu, lalu klik **Begin setup**. [Panduan integrasi Git Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)
3. Isi pengaturan berikut pada halaman setup.

   | Pengaturan | Nilai |
   | --- | --- |
   | Project name | `motion-studio` atau nama lain yang tersedia |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Kosong (root repo) |
   | Environment variable | `NODE_VERSION` = `24.13.0` |

   [Pengaturan build](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Versi Node.js](https://developers.cloudflare.com/pages/configuration/build-image/)

4. Klik **Save and Deploy** dan tunggu status deployment berhasil. Buka URL HTTPS `pages.dev` yang tertera di dashboard dan jalankan smoke test di checklist rilis. Untuk pembaruan, jalankan pemeriksaan lokal lalu push source dan lockfile ke `main`. Periksa log dan URL deployment yang baru. [Panduan integrasi Git Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)

Jika dashboard menampilkan **Deploy command** seperti `npx wrangler deploy`, Anda berada di pengaturan Workers. Buka **Workers & Pages → Create application → Pages → Connect to Git** untuk membuat proyek Pages dengan **Build output directory** `dist`. [Pengaturan Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

### Direct Upload

1. Jalankan `npm ci`, `npm run build`, dan `npm run preview`. Periksa `dist/index.html`, `dist/assets/`, dan `dist/ai-guide.md`.
2. Di dashboard Cloudflare, buka **Workers & Pages → Create application → Get started → Drag and drop your files**. Isi nama proyek, unggah folder `dist`, lalu klik **Deploy site**. [Panduan Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/#drag-and-drop)
3. Untuk pembaruan, buat build baru, buka proyek Pages yang sama, pilih **Create a new deployment → Production**, dan unggah folder `dist` yang baru. Buka URL HTTPS dari dashboard dan ulangi smoke test. [Membuat deployment baru](https://developers.cloudflare.com/pages/get-started/direct-upload/#create-a-new-deployment)

## Tes fisik Chrome pada POCO F6

Gunakan URL HTTPS deployment dan mulai dari Orbit 01 pada 720p30. Catat versi Chrome dan Android, waktu render, ukuran, dan hasil playback. Ikuti urutan klip 5, 10, dan 15–30 detik, kemudian cek audio, simpan/muat ulang, serta render berulang. Tabel hasil dan langkah lengkap ada di [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md#gate-fisik-poco-f6).

## Dukungan browser dan troubleshooting Android

- Gunakan Chrome terbaru melalui HTTPS atau `localhost`. Preview memerlukan WebGL2. Ekspor juga memerlukan WebCodecs dan dukungan H.264 pada resolusi serta FPS yang dipilih. Chrome desktop 157.0.8103.80 teruji, sedangkan status Chrome Android fisik dan batas perangkat tercatat di [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
- Jika **Konteks aman** gagal, buka URL `https://…pages.dev` dari dashboard. Alamat IP LAN melalui HTTP cukup untuk preview jika WebGL2 tersedia. Untuk ekspor dari LAN, gunakan HTTPS yang dipercaya perangkat.
- Jika WebGL2 gagal, muncul layar hitam, atau render berhenti, tutup tab lain, muat ulang, dan coba klip 5 detik pada 540p. Jika H.264 ditolak pada 720p, periksa hasil 540p di panel diagnostik. FPS mengikuti proyek. Prioritas perangkat keras hanya preferensi yang diteruskan ke browser.
- Jika AAC ditolak, coba **Ekspor tanpa audio**. Jika file gagal didekode, pilih MP3/WAV lain yang dapat diputar. Setelah cerita dipendekkan, periksa frame mulai di tab **Audio**. **Batalkan** menghentikan job aktif dan **Coba lagi** memulai job baru.
- Jaga tab tetap di depan dan layar menyala. Studio mencoba memperoleh Screen Wake Lock jika tersedia. Bila ponsel panas, jeda antar-ekspor. Untuk diagnosis, catat pesan lengkap, resolusi, FPS, waktu render, versi Chrome, dan apakah hasil mulai diunduh.

## Data lokal dan lisensi Remotion

Rendering memakai geometri procedural, berkas aplikasi dari origin yang sama, dan font sistem. Setelah aset dan modul yang diperlukan termuat, ekspor dapat selesai tanpa jaringan. JSON, audio, dan video diproses di perangkat.

Menurut FAQ Remotion, pemakaian individu memenuhi syarat Free License. Motion Studio memakai nilai publik `free-license` pada Remotion 4.0.546. Tinjau kembali ketentuan jika model penggunaan berubah, misalnya dipakai oleh organisasi. [FAQ lisensi Remotion](https://www.remotion.dev/docs/license/faq) · [Ketentuan Remotion](https://www.remotion.dev/docs/license)

Saat render, Remotion mencoba mengirim telemetri lisensi, termasuk origin, alamat IP, dan status render. Dokumentasi Remotion menyatakan bahwa event tersebut tidak memuat isi atau metadata video dan bahwa gangguan telemetri tidak menggagalkan render. [Telemetri Remotion](https://www.remotion.dev/docs/telemetry)
