# Checklist rilis Motion Studio

**24 November 2026 · Sesi 6**

Gunakan **PASS**, **FAIL**, atau **NOT TESTED** untuk setiap pemeriksaan. Pisahkan hasil Chrome desktop dari hasil POCO F6 fisik. Simpan hasil terakhir di [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Kandidat rilis

| Pemeriksaan | Status |
| --- | --- |
| Instalasi bersih, TypeScript, ESLint, Vitest, Playwright, dan build Vite | PASS di Windows |
| `dist/` tersaji lewat Vite preview. Semua berkas kurang dari 25 MiB | PASS |
| JSON v1, AI Guide, fixture, seek lintas scene, simpan dan muat ulang | PASS di Chrome desktop |
| Kontrol, tab keyboard, fokus dialog, dan preview pada viewport 360 px | PASS di Chrome desktop |
| H.264 MP4, AAC, playback, batal/coba lagi, ekspor berulang dan MP4 senyap | PASS di Chrome desktop |
| Deployment build Sesi 6 ke Cloudflare Pages melalui HTTPS | NOT TESTED |
| Acceptance penuh di Chrome fisik POCO F6 | NOT TESTED |

## Smoke test deployment

1. Pilih metode dari [README](README.md#deploy-ke-cloudflare-pages). Buat dan periksa `dist/` sebelum mengunggah. Untuk Git integration, periksa branch, commit, versi Node.js dan `dist` di log Cloudflare.
2. Buka URL HTTPS yang ditampilkan dashboard. Pastikan judul **Orbit 01** muncul, preview berputar, **Copy AI Guide** menyalin panduan, dan diagnostik membaca konteks aman. Periksa console serta Network untuk kegagalan aset.
3. Di Chrome desktop, ekspor Orbit 01 pada 720p30, unduh dan putar MP4. Jika preflight menolak konfigurasi itu, catat alasannya dan uji 540p30. Verifikasi URL yang sama di POCO F6 sesuai checklist di bawah.
4. Catat URL, tanggal, commit atau identitas build, dan status smoke test.

## Gate fisik POCO F6

Buka URL HTTPS deployment di Chrome terbaru. Catat tanggal, URL/build, versi Android/HyperOS, versi Chrome dari `chrome://version`, ruang penyimpanan, dan kondisi perangkat. Jaga tab aktif dan layar menyala selama render. Gunakan file MP3/WAV dengan awal bunyi yang jelas untuk memeriksa offset.

| Uji fisik | Cara menjalankan dan kriteria lulus | Status |
| --- | --- | --- |
| Diagnostik dan kontrol | Periksa konteks aman, WebGL2, WebCodecs dan H.264 720p30. Putar, jeda, geser scrubber, dan buka tab Story, Scenes, Audio serta dialog Ekspor. Kontrol harus bisa dijangkau tanpa scroll horizontal. | NOT TESTED |
| 720p30 · 5 detik | Ekspor **Orbit 01**. Unduh dan putar MP4 720 × 1280, 150 frame. Periksa robot, platform, gerak kamera, judul, dan durasi. | NOT TESTED |
| 720p30 · 10 detik | Mulai dari `example-story.json`, hapus scene `joy` dari array `scenes`, lalu impor JSON. Pastikan UI menunjukkan 2 scene dan 300 frame. Ekspor, unduh dan putar. Cek kedua caption dan cut pada detik 5. | NOT TESTED |
| 720p30 · 15–30 detik | Muat dan terapkan **Robot dan Kristal** untuk 15 detik dan 450 frame. Seek satu frame sebelum dan sesudah detik 5 serta 10. Ekspor dan putar seluruh MP4. Ketiga scene, karakter, kamera dan caption harus terlihat. | NOT TESTED |
| Audio AAC dan sinkronisasi | Pada cerita 15 detik, impor narasi WAV dan musik MP3. Atur narasi pada frame 30 dan musik pada frame 165, lalu simpan pengaturan. Cek preview dan hasil MP4 untuk awal bunyi pada 1,0 dan 5,5 detik, sinkronisasi lintas cut dan akhir di detik 15. Jika AAC gagal, catat **FAIL** untuk AAC dan uji **Ekspor tanpa audio** secara terpisah. | NOT TESTED |
| Simpan, muat ulang dan JSON | Tempel atau impor JSON valid, lalu uji `{` dan salin pesan error. Cerita aktif tetap bisa diputar. Setelah **Tersimpan lokal**, muat ulang dan periksa judul, scene serta lampiran audio. Unduh JSON dan impor kembali pada proyek baru. | NOT TESTED |
| Batal, coba lagi dan ekspor berulang | Pada Orbit 01, geser preview, mulai render, batalkan setelah progres muncul, lalu **Coba lagi**. Putar hasil. Ekspor 720p30 lagi 2–3 kali dalam tab yang sama. Pastikan setiap hasil bisa diputar, posisi preview pulih, dan tidak terjadi layar hitam, crash, atau reload tab. | NOT TESTED |
| 540p30 · fallback | Jika 720p ditolak atau gagal, ekspor Orbit 01 pada 540p30 (540 × 960). Verifikasi MP4 dapat diputar dan tetap 5 detik. Catat hasil terpisah dari baseline 720p. | NOT TESTED |
| 1080p30 · opsional, 5 detik | Setelah baseline 720p30 lulus, cek preflight dan ekspor Orbit 01 pada 1080p30 (1080 × 1920) bila didukung. Unduh dan putar MP4. | NOT TESTED |

### Catatan per render

Isi satu baris untuk setiap percobaan, termasuk yang dibatalkan atau gagal. Catat preferensi encoder dari panel dan suhu bila terasa panas. Angka waktu diambil dari **Hasil render terakhir**. Durasi dan ukuran dapat diperiksa dari file unduhan.

| Status | Proyek, resolusi, FPS, audio | Frame dan durasi aktual | Waktu / throughput | Ukuran file | Playback, sync, error, panas atau crash |
| --- | --- | --- | --- | --- | --- |
| NOT TESTED | 720p30 · Orbit 01 · 5 detik | | | | |
| NOT TESTED | 720p30 · 10 detik | | | | |
| NOT TESTED | 720p30 · Robot dan Kristal · 15 detik | | | | |
| NOT TESTED | 720p30 · Robot dan Kristal · AAC | | | | |

Kandidat rilis siap diunggah setelah semua pemeriksaan lokal lulus. Penerimaan MVP menunggu deployment HTTPS dan gate fisik POCO F6. Jika AAC gagal sementara ekspor senyap lulus, catat rilis sebagai terbatas sesuai PRD.
