# Motion Studio

**Sesi 1 · Orbit 01** adalah demo robot 3D vertikal berdurasi 5 detik. Preview dan ekspor memakai komposisi yang sama. Three.js menggambar setiap frame, lalu WebCodecs mengenkode video H.264 ke MP4 di browser. Demo memakai 30 FPS dan 150 frame dengan pilihan 720 × 1280 atau 540 × 960, tanpa audio.

## Jalankan di Windows

Gunakan Node.js 24 LTS dan npm. Perintah berikut dijalankan di root proyek.

```sh
npm ci
npm run dev
```

Buka URL loopback yang dicetak Vite. Tekan **Putar preview**, geser posisi frame, lalu pilih resolusi dan tekan **Ekspor MP4**. Tunggu hingga **Unduh MP4** tersedia. **Batalkan** menghentikan job yang sedang berjalan dan **Coba lagi** memulai job baru.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Build produksi ada di `dist/`. Playwright memakai Chrome desktop yang terpasang dan melayani build produksi secara otomatis. Jalankan `npm run test:e2e` setelah build. Alternatifnya, instal Chromium dengan `npx playwright install chromium`, set variabel lingkungan `MOTION_BROWSER=chromium`, lalu jalankan `npm run test:e2e`. Uji ekspor akan mencatat skip bila codec atau konteks grafis yang diperlukan tidak tersedia.

## Deploy ke Cloudflare Pages dari GitHub

1. Pastikan branch `main` sudah ada di repo `Jagopian123/motion-studio` di GitHub.
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

4. Klik **Save and Deploy**. Cloudflare memasang dependensi, menjalankan build, lalu menyajikan isi `dist/`. Setelah deploy berhasil, buka URL HTTPS `pages.dev` yang tertera di dashboard. Push berikutnya ke `main` memicu deploy produksi secara otomatis. Ekspor MP4 tetap berlangsung di browser perangkat. [Panduan integrasi Git Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)

Jika dashboard menampilkan **Deploy command** seperti `npx wrangler deploy`, Anda berada di pengaturan Workers. Buka **Workers & Pages → Create application → Pages → Connect to Git** untuk membuat proyek Pages dengan **Build output directory** `dist`. [Pengaturan Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

## Tes fisik Chrome pada POCO F6

1. Buka URL `pages.dev` melalui HTTPS. Catat model, versi Android/HyperOS, dan versi Chrome dari `chrome://version`. Saat mengetes dari LAN, gunakan HTTPS tepercaya. Alamat IP LAN lewat HTTP tidak menyediakan secure context yang diperlukan encoder.
2. Pastikan diagnostik menunjukkan konteks aman, WebGL2, WebCodecs, dan dukungan H.264. Putar dan geser preview. Periksa robot, orbit kamera, platform, dan judul.
3. Pilih **720p**, ekspor sambil mempertahankan tab aktif dan layar menyala, lalu unduh MP4. Putar file dari Unduhan Chrome. Periksa klip 5 detik, resolusi 720 × 1280, gerakan robot dan kamera, serta judul yang terlihat. Catat waktu render, jumlah frame, ukuran file dan mode encoder dari panel.
4. Mulai ekspor lagi, batalkan ketika progres bergerak, dan ulangi. Uji **540p** (540 × 960, 30 FPS) sebagai pembanding atau jika 720p gagal. Catat hasil masing-masing, pesan error utuh, dan apakah terjadi crash atau layar hitam.

## Dukungan browser dan data

- Prioritas encoder perangkat keras adalah permintaan ke browser. Bila preflight menolaknya, atau encoder gagal saat render, aplikasi dapat mencoba konfigurasi dengan encoder pilihan browser. Dukungan 540p diuji terpisah. FPS selalu 30 di kedua preset.
- Bundle, geometri, dan font sistem cukup untuk preview dan ekspor setelah aplikasi dan modul renderer termuat. Video dan file proyek berada di perangkat. Remotion 4.0.546 mencoba mengirim telemetri penggunaan lisensi yang mencakup origin dan hasil render. Ekspor tetap berjalan saat telemetri tidak dapat terkirim. Konfigurasi `free-license` digunakan untuk Sesi 1 pribadi. [Telemetri Remotion](https://www.remotion.dev/docs/telemetry) · [FAQ lisensi](https://www.remotion.dev/docs/license/faq)
- Status dan hasil aktual ada di [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
