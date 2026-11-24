# Status implementasi Motion Studio

**24 November 2026 · Sesi 2 · JSON v1 dan engine animasi**

## Implementasi Sesi 2

| Bagian | File |
| --- | --- |
| Schema Zod strict, normalisasi, validasi semantik dan impor | `src/engine/schema/` |
| Rentang scene, lookup caption, easing dan evaluator transform/kamera | `src/engine/timeline/` |
| Komposisi bersama, node 3D, kamera dan renderer scene | `src/engine/composition/`, `src/engine/scene/` |
| Fixture dua scene, textarea impor, preview dan seek scene | `src/examples/primitive-story.json`, `src/app/`, `src/style.css` |
| Adapter MP4, dimensi sesuai rasio dan preflight sesuai FPS | `src/features/export/` |
| Tes, dependensi dan langkah menjalankan aplikasi | `e2e/`, tes unit di `src/`, `package.json`, `package-lock.json`, `README.md` |

- `validateStoryV1` mengenali kontrak lengkap v1, termasuk preset, dan mengembalikan dokumen baru dengan default deterministik. `parseStory` membatasi 1 MiB UTF-8 dan melaporkan path preset yang belum dapat dirender. Editor hanya mengganti proyek aktif setelah impor berhasil. Zod 4.6.7 memakai parser tanpa JIT. `example-story.json` tetap menjadi fixture kontrak v1.
- **Observatorium Prisma** memakai enam primitive, parent transform, kamera perspective dan orthographic, lighting, fog, ground serta caption. Satu `ThreeCanvas` aktif per scene dalam `Sequence`. Frame scene dimulai dari 0, hard cut terjadi pada frame global 90, dan Player serta eksportir menerima dokumen yang sama. [Remotion Sequence](https://www.remotion.dev/docs/sequence) · [Remotion ThreeCanvas](https://www.remotion.dev/docs/three-canvas)
- Adapter ekspor memakai H.264 MP4 dan preflight 720p/540p dari Sesi 1. Dimensi mengikuti rasio 9:16, 16:9, atau 1:1. FPS 24/30 berasal dari proyek dan perubahan proyek dikunci selama render. Orbit 01 tetap tersedia sebagai demo awal. Semua paket Remotion tetap exact `4.0.546`. [Remotion Web Renderer](https://www.remotion.dev/docs/web-renderer/render-media-on-web)

## Pemeriksaan aktual Sesi 2

Windows, Node.js 24.13.0, npm 11.6.2, Chrome desktop 157.0.8103.80. Perintah memakai `npm.cmd` karena PowerShell membatasi skrip `npm.ps1`.

| Perintah | Hasil |
| --- | --- |
| `npm.cmd ci --cache "$env:TEMP\motion-studio-npm-cache"` | PASS, 220 paket terpasang dan audit melaporkan 0 kerentanan. Percobaan awal terkendala file native Lightning CSS yang masih terbuka dari server preview QA. Instalasi bersih lulus setelah server tersebut dihentikan |
| `npm.cmd run typecheck` | PASS, TypeScript strict |
| `npm.cmd run lint` | PASS, ESLint |
| `npm.cmd test` | PASS, 42 test dari 4 file. Mencakup fixtures, batas ukuran dan struktur, semantik, easing, seek, caption dan pemetaan rasio |
| `npm.cmd run build` | PASS, `dist/index.html` dan 7 aset. Aset terbesar 1.642.415 byte. Vite memperingatkan chunk di atas 500 kB. Semua aset berada di bawah batas Cloudflare Pages 25 MiB. [Batas aset Cloudflare](https://developers.cloudflare.com/pages/platform/limits/#file-size) |
| `npm.cmd run test:e2e` | PASS, 8 dari 8 pada build produksi tanpa skip. Mencakup regresi S1, viewport 360 px, tiga jenis kegagalan impor, seek dua arah pada frame 89/90, hasil gambar identik saat kembali ke frame 0, dan dua ekspor cerita |
| `git diff --check` | PASS, tanpa kesalahan whitespace |

| Unduhan MP4 Chrome desktop | Resolusi dan FPS | Durasi | Frame | Waktu render | Ukuran file |
| --- | --- | --- | --- | --- | --- |
| S1 Orbit 01, 720p setelah batal dan coba lagi | 720 × 1280, 30 | 5,00 dtk | 150 | 4,9 dtk | 2.332.566 byte |
| S1 Orbit 01, 540p | 540 × 960, 30 | 5,00 dtk | 150 | 3,2 dtk | 1.565.891 byte |
| S2 Observatorium Prisma, 720p vertikal | 720 × 1280, 30 | 6,00 dtk | 180 | 5,2 dtk | 1.526.313 byte |
| S2 varian dari JSON yang sama, 540p lanskap | 960 × 540, 24 | 7,50 dtk | 180 | 3,5 dtk | 779.170 byte |

Keempat ekspor selesai dengan jaringan browser offline setelah preflight dan preferensi encoder perangkat keras. Mediabunny memverifikasi container MP4, codec AVC/H.264, dimensi, frame rate, jumlah frame, durasi dan nol track audio. Screenshot preview kedua scene dan empat frame 720p hasil playback Chrome diperiksa secara visual. Pemeriksaan piksel mengonfirmasi perubahan objek serta caption bawah sebelum hard cut dan caption atas setelahnya. Untuk 1:1, pemetaan dimensi diuji di unit test.

## Gate perangkat dan handoff

| Pemeriksaan | Status |
| --- | --- |
| S1 · Render dan unduh Orbit 01 di HP | PASS berdasarkan laporan pengguna. Rincian model, Chrome, resolusi, URL dan hasil playback belum tercatat |
| S2 · Impor, seek, ekspor dan putar Observatorium Prisma di POCO F6 Chrome | NOT TESTED secara fisik |
| S2 · Build/deploy Cloudflare Pages dan akses HTTPS | NOT TESTED pada deployment S2 |

Untuk pemeriksaan S2 di POCO F6, buka hasil deploy HTTPS, terapkan **Observatorium Prisma**, seek melewati detik 3, lalu coba impor JSON rusak dan periksa cerita aktif. Unduh dan putar hasil 720p30 selama 6 detik. Catat versi Android/Chrome, ukuran dan waktu render, mode encoder serta kejadian crash atau layar hitam. Milestone berikutnya adalah **Sesi 3, Character, object library, motion dan AI guide**, mengikuti hasil gate perangkat. [Checklist perangkat](README.md#tes-fisik-chrome-pada-poco-f6)

## Riwayat Sesi 1 / F01

**24 November 2026 · Proof of concept 3D → MP4 lokal**

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

## Gate perangkat pada pengujian Sesi 1

| Pengujian | Status |
| --- | --- |
| Deploy Cloudflare Pages dari GitHub dan buka HTTPS `pages.dev` | NOT TESTED |
| POCO F6 Chrome · diagnostik dan preview | NOT TESTED |
| POCO F6 Chrome · 720p30, unduh dan putar MP4 5 detik | NOT TESTED |
| POCO F6 Chrome · 540p30, batal/coba lagi, render berulang | NOT TESTED |

Saat pemeriksaan Sesi 1, `adb devices -l` tidak menemukan perangkat tersambung. `README.md` mencatat pengaturan Cloudflare Pages yang membangun `dist/` dari branch `main` di GitHub dan checklist untuk melengkapi data uji perangkat.

Referensi API dan hosting. [ThreeCanvas](https://www.remotion.dev/docs/three-canvas) · [Preflight](https://www.remotion.dev/docs/web-renderer/can-render-media-on-web) · [Web Renderer](https://www.remotion.dev/docs/web-renderer/render-media-on-web) · [Telemetri Remotion](https://www.remotion.dev/docs/telemetry) · [Vite static deployment](https://vite.dev/guide/static-deploy.html) · [Integrasi Git Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)
