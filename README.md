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

## Deploy `dist/` ke Cloudflare Pages

1. Jalankan `npm ci` dan `npm run build`.
2. Di dashboard Cloudflare buka **Workers & Pages**, pilih **Create application**, lalu **Get started** dan **Drag and drop your files**.
3. Beri nama proyek Pages, unggah folder `dist/` sebagai build output, lalu pilih **Deploy site**. Akar aset yang diunggah berisi `index.html`.
4. Buka `https://<nama-proyek>.pages.dev` di Chrome. Untuk pembaruan gunakan **Create a new deployment** dan unggah `dist/` dari build baru. [Panduan Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## Tes fisik Chrome pada POCO F6

1. Buka URL `pages.dev` melalui HTTPS. Catat model, versi Android/HyperOS, dan versi Chrome dari `chrome://version`. Saat mengetes dari LAN, gunakan HTTPS tepercaya. Alamat IP LAN lewat HTTP tidak menyediakan secure context yang diperlukan encoder.
2. Pastikan diagnostik menunjukkan konteks aman, WebGL2, WebCodecs, dan dukungan H.264. Putar dan geser preview. Periksa robot, orbit kamera, platform, dan judul.
3. Pilih **720p**, ekspor sambil mempertahankan tab aktif dan layar menyala, lalu unduh MP4. Putar file dari Unduhan Chrome. Periksa klip 5 detik, resolusi 720 × 1280, gerakan robot dan kamera, serta judul yang terlihat. Catat waktu render, jumlah frame, ukuran file dan mode encoder dari panel.
4. Mulai ekspor lagi, batalkan ketika progres bergerak, dan ulangi. Uji **540p** (540 × 960, 30 FPS) sebagai pembanding atau jika 720p gagal. Catat hasil masing-masing, pesan error utuh, dan apakah terjadi crash atau layar hitam.

## Dukungan browser dan data

- Prioritas encoder perangkat keras adalah permintaan ke browser. Bila preflight menolaknya, atau encoder gagal saat render, aplikasi dapat mencoba konfigurasi dengan encoder pilihan browser. Dukungan 540p diuji terpisah. FPS selalu 30 di kedua preset.
- Bundle, geometri, dan font sistem cukup untuk preview dan ekspor setelah aplikasi dan modul renderer termuat. Video dan file proyek berada di perangkat. Remotion 4.0.546 mencoba mengirim telemetri penggunaan lisensi yang mencakup origin dan hasil render. Ekspor tetap berjalan saat telemetri tidak dapat terkirim. Konfigurasi `free-license` digunakan untuk Sesi 1 pribadi. [Telemetri Remotion](https://www.remotion.dev/docs/telemetry) · [FAQ lisensi](https://www.remotion.dev/docs/license/faq)
- Status dan hasil aktual ada di [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
