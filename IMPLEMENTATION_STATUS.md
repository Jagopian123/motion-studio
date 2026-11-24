# Status implementasi Motion Studio

**24 November 2026 · Sesi 1 / F01 · Proof of concept 3D → MP4 lokal**

## Implementasi

| Bagian | File |
| --- | --- |
| App dan kontrol preview | `src/app/`, `src/main.tsx`, `src/style.css` |
| Komposisi 3D yang dipakai Player dan ekspor | `src/engine/composition/StoryComposition.tsx`, `OrbitRobot.tsx`, `demo.ts` |
| Diagnostik, preset dan lifecycle ekspor | `src/features/export/` |
| QA dan build statis | `e2e/demo.spec.ts`, unit test `src/**/*.test.ts`, `package.json`, `package-lock.json`, konfigurasi Vite, Playwright, Vitest, TypeScript, dan ESLint |
| Operasi dan uji perangkat | `README.md` |

- Orbit 01 menggunakan 150 frame pada 30 FPS, dimensi vertikal 9:16, kamera orbit, robot procedural, platform, pencahayaan dan judul DOM di luar `ThreeCanvas`. Pose dihitung dari frame/fps. Preview memakai DPR 1 dan dilepas selama ekspor untuk mengurangi pemakaian WebGL. Preview kembali ke frame awal setelah ekspor atau pembatalan.
- `canRenderMediaOnWeb` mengecek MP4/H.264, bitrate, dimensi, output in-memory dan kondisi tanpa audio. API v4.0.546 tidak menerima FPS atau `hardwareAcceleration` pada fungsi preflight. `VideoEncoder.isConfigSupported` mengecek keduanya secara terpisah. 720p memakai 4 Mbps dan 540p 2,5 Mbps. Aplikasi menguji kedua preset, menawarkan 540p ketika 720p ditolak, dan mencoba pilihan encoder browser jika mode prioritas perangkat keras gagal pada tahap encoding. Preferensi encoder tidak membuktikan jalur hardware yang dipakai.
- `renderMediaOnWeb` dengan `AbortController`, callback progres asli dan `getBlob()` menjalankan ekspor. Aplikasi mengecek MIME dan signature MP4, melepas object URL lama, dan menampilkan ukuran file, elapsed dan jumlah frame. Demo pendek disimpan sebagai satu hasil in-memory.
- `remotion`, `@remotion/player`, `@remotion/three`, `@remotion/web-renderer`, dan `@remotion/licensing` resolusi transitif terkunci di **4.0.546**. `npm ls` menunjukkan React/React DOM **19.3.1**, R3F **9.8.2**, dan Three.js **0.187.0** terdeduplikasi. R3F 9.8.2 mensyaratkan React/React DOM `>=19 <19.4` dan Three `>=0.156`. `@remotion/three` mensyaratkan React/React DOM `>=16.8.0`, R3F `>=8.0.0`, Three `>=0.137.0`, dan Remotion versi identik.
- `example-story.json` merupakan fixture v1 untuk milestone engine berikutnya. Demo Sesi 1 didefinisikan langsung sebagai komposisi pendek agar pengujian hanya bergantung pada jalur 3D dan encoding.

## Pemeriksaan aktual

Windows, Node.js 24.13.0, npm 11.6.2, Google Chrome 157.0.8103.80, Intel UHD Graphics. Hasil Chrome headless dilaporkan sebagai pengujian desktop.

| Perintah | Hasil |
| --- | --- |
| `npm ci` | PASS, 221 paket terpasang, audit npm melaporkan 0 kerentanan saat dijalankan |
| `npm run typecheck` | PASS, TypeScript strict |
| `npm run lint` | PASS, ESLint |
| `npm test` | PASS, 8 test dari 2 file |
| `npm run build` | PASS, `dist/index.html` dan 7 aset. Aset terbesar 1.531.284 byte (1,46 MiB), di bawah batas 25 MiB Cloudflare. Vite mengeluarkan peringatan ukuran chunk di atas 500 kB |
| `npm run test:e2e` | PASS, 5 test pada build produksi yang disajikan lewat `npm run preview`. Meliputi preview dan seek pada viewport 360 × 800, WebCodecs absen, fallback ketika 720p ditolak, progres dan pembatalan, coba lagi, serta ekspor dan playback kedua preset saat jaringan browser offline setelah preflight |

Mediabunny membaca kembali file unduhan untuk memeriksa container MP4, video AVC/H.264, dimensi, 150 frame, 30 FPS, durasi 5,00 detik, dan nol track audio. Tes Chrome memutar video serta memeriksa piksel judul dan perubahan gambar robot antara frame awal dan akhir. Tangkapan preview desktop, viewport 360 px, dan frame hasil dekode 720p diperiksa secara visual. Percobaan awal pemeriksaan piksel membaca `seeked` sebelum Chrome menyediakan frame untuk dibaca. Tes diperbaiki dengan menunggu frame playback melalui `requestVideoFrameCallback`.

| MP4 Chrome desktop | Durasi | Frame | Elapsed | Ukuran file | Hasil |
| --- | --- | --- | --- | --- | --- |
| 720 × 1280, 30 FPS | 5,00 dtk | 150 | 16,4 dtk | 2.332.566 byte | PASS, setelah batal dan coba lagi |
| 540 × 960, 30 FPS | 5,00 dtk | 150 | 9,4 dtk | 1.565.891 byte | PASS |

Keduanya memakai preferensi `prefer-hardware` dan proses render selesai dengan jaringan browser offline setelah preflight. Build memuat aset lokal dari origin Vite. Versi Remotion ini dapat mencoba mengirim telemetri lisensi saat online. Jalur fallback pemilihan resolusi diuji dengan penolakan 720p yang disimulasikan. Mode fallback encoder saat render tidak terpicu pada dua ekspor desktop ini. [Telemetri Remotion](https://www.remotion.dev/docs/telemetry)

### Perbaikan instalasi Cloudflare

Log Cloudflare untuk commit `1cc48ab` berhenti pada `npm clean-install --progress=false` dengan `EUSAGE` karena dua dependensi transitif opsional yang diperlukan oleh binding WASM Rolldown belum tercatat di lockfile. Error yang sama direproduksi pada Ubuntu 24.04 x64 (WSL), Node.js 24.13.0, dan npm 11.21.3. `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` menghasilkan entri `@emnapi/core` dan `@emnapi/runtime` versi `2.0.0-beta.2`. Versi paket yang sudah terkunci tetap sama.

Dengan lockfile yang diperbaiki, `npm clean-install --progress=false` lulus di Ubuntu (223 paket terpasang, audit melaporkan 0 kerentanan), diikuti `npm run build` (menghasilkan `dist/index.html`), `npm run typecheck`, `npm run lint`, dan `npm test` (8 test lulus). Verifikasi deployment HTTPS tetap tercatat pada tabel berikut.

## Gate perangkat

| Pengujian | Status |
| --- | --- |
| Deploy Cloudflare Pages dari GitHub dan buka HTTPS `pages.dev` | NOT TESTED |
| POCO F6 Chrome · diagnostik dan preview | NOT TESTED |
| POCO F6 Chrome · 720p30, unduh dan putar MP4 5 detik | NOT TESTED |
| POCO F6 Chrome · 540p30, batal/coba lagi, render berulang | NOT TESTED |

`adb devices -l` tidak menemukan perangkat tersambung. `README.md` mencatat pengaturan Cloudflare Pages yang membangun `dist/` dari branch `main` di GitHub. Setelah deploy, ikuti checklist fisik di `README.md`, lalu catat versi Chrome/Android, hasil diagnostik, durasi, waktu render dan ukuran file. Gate untuk Sesi 2 baru terpenuhi setelah POCO F6 menghasilkan MP4 baseline 720p30 yang bisa diputar melalui situs HTTPS. Jika gagal, gunakan prompt troubleshooting S1 di `PROMPTS.md` untuk memperbaiki jalur baseline.

Referensi API dan hosting. [ThreeCanvas](https://www.remotion.dev/docs/three-canvas) · [Preflight](https://www.remotion.dev/docs/web-renderer/can-render-media-on-web) · [Web Renderer](https://www.remotion.dev/docs/web-renderer/render-media-on-web) · [Telemetri Remotion](https://www.remotion.dev/docs/telemetry) · [Vite static deployment](https://vite.dev/guide/static-deploy.html) · [Integrasi Git Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)
