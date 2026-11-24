# Motion Studio — Prompt Codex per Sesi

## Cara memakai paket ini
1. Buat folder project `motion-studio` di laptop Windows. Salin PRD.md, AGENTS.md, PROMPTS.md, dan example-story.json ke root folder.
2. Buka folder lewat VS Code/Codex, login dengan akun ChatGPT. Gunakan satu prompt sesi di bawah per giliran; jangan sekaligus. Semua sesi bekerja pada repository yang sama.
3. Setelah setiap sesi, jalankan aplikasi dan periksa hasil. Jika memulai percakapan Codex baru, AGENTS.md dan IMPLEMENTATION_STATUS.md menjadi konteks handoff. Commit lokal bila sudah stabil.
4. Sesi 1 wajib dites di POCO F6 melalui situs HTTPS sebelum melanjutkan implementasi besar. Tidak perlu menyewa server.

## Sesi 1 — Proof of concept: 3D ke MP4 lokal (WAJIB pertama)

```text
Baca AGENTS.md dan PRD.md. Implementasikan hanya milestone S1 Motion Studio, yaitu proof of concept rendering 3D lokal di browser. Kerjakan langsung di repository ini, bukan sekadar memberi contoh atau rencana.

Tujuan: buktikan Three.js + Remotion bisa mengekspor video 3D MP4 di Chrome Android POCO F6 tanpa backend/API/VPS. Buat Vite + React + TypeScript strict dengan npm. Gunakan paket Remotion stable yang mendukung client-side rendering ThreeCanvas; pin semua versi Remotion exact dan sama. Cek React/R3F/Three peer dependencies dan dokumentasi resmi untuk API renderMediaOnWeb/canRenderMediaOnWeb. Jangan pakai @remotion/renderer server-side.

Buat satu komposisi 5 detik, 720×1280, 30 FPS: robot procedural atau beberapa mesh 3D stylized di atas ground, pencahayaan, objek bergerak dan kamera orbit, teks sederhana di luar ThreeCanvas. Animasi menggunakan useCurrentFrame dan fps, deterministik. Gunakan @remotion/player untuk preview dari komposisi yang sama dengan export.

Buat halaman diagnostik sederhana yang mobile-friendly: cek HTTPS/secure context, WebGL2, WebCodecs dan konfigurasi H.264 MP4 720p30. Tombol preview, export lokal MP4, progress riil, cancel menggunakan AbortController, download, retry, pesan error yang bisa ditindaklanjuti. Jika unsupported, uji 540p; jangan pura-pura mendukung MP4. Prefer hardware encoding bila didukung dan catat fallback. Tampilkan waktu render, jumlah frame, ukuran file setelah sukses. Jangan membuat dashboard final, schema kompleks, preset library atau audio dulu.

Pastikan build statis tidak menggunakan network AI maupun server saat rendering. Tambah README langkah npm ci/dev/build/preview dan deploy dist ke Cloudflare Pages (Direct Upload atau Git, pilih secara konsisten). Buat unit checks yang relevan dan browser smoke test; jalankan typecheck/lint/test/build. Jika browser lokal mendukung, benar-benar ekspor klip dan verifikasi hasil. Jika tidak punya akses POCO F6, jangan mengklaim sukses di HP: buat checklist pengujian manual di HTTPS Pages dengan 720p/540p, catat NOT TESTED. Update IMPLEMENTATION_STATUS.md sesuai AGENTS.md. Berhenti setelah milestone ini.
```

Gate: user membuka URL Cloudflare dari POCO F6, menjalankan demo, memperoleh MP4 5 detik yang bisa diputar. Jika gagal, perbaiki baseline dengan prompt troubleshooting di bagian bawah sebelum S2.

## Sesi 2 — JSON schema, timeline dan scene engine

```text
Baca AGENTS.md, PRD.md, example-story.json dan IMPLEMENTATION_STATUS.md. Pastikan S1 masih berfungsi. Implementasikan milestone S2: engine animasi berbasis data JSON v1, fokus pada kontrak schema dan determinisme. Pertahankan satu jalur composition untuk preview dan export.

Buat schema strict Zod sesuai bagian 7 PRD: schemaVersion, title, aspectRatio, fps, scenes, world, lighting, camera, group/mesh/preset node, parentId, transform tracks, captions. Buat semantic validator dengan error path untuk scene total, id duplikat, parent hilang/cycle, range angka, keyframe order, frame eksklusif, unknown fields, unsupported geometry/preset, overlap captions, serta batas ukuran. Implementasikan default normalization. Sediakan API parse/validate yang tidak mengubah project aktif bila gagal. Dilarang eval, Function, arbitrary code dan remote URLs.

Buat pure utilities cumulative scene ranges, frame lookup, vector interpolation dan easing (linear/easeIn/easeOut/easeInOut/step), transform evaluator yang bisa seek maju/mundur, camera evaluator dengan position/target/fov/orthoSize. Gunakan Y-up, derajat ke radians, hierarchy parent transform. Implementasikan group dan semua primitive mesh v1 (box/sphere/cylinder/cone/capsule/torus), MeshStandardMaterial, ground, background, lighting dan fog. Caption overlay aman di luar canvas. Buat StoryComposition yang menggunakan satu ThreeCanvas aktif per scene, Sequence dan local frame secara tepat.

Preset registry lengkap dikerjakan di S3; untuk sesi ini validasi tipe preset v1 dan tampilkan pesan unsupported yang jelas jika ada fixture memakai preset belum terimplementasi, jangan silently skip. Buat fixture primitive-only untuk demo S2. Simpan example-story.json asli untuk S3. Tambahkan import textarea + apply sederhana untuk test engine dan scene seek; UI polished bukan tujuan sesi ini. Export 5–10 detik dari JSON demo melalui adapter S1.

Unit tests untuk schema dan semantic validation, cycles, bounds, unknown fields, scene boundaries, interpolation, seek, captions dan aspect-ratio mapping. Test browser preview dan ekspor jika lingkungan mendukung. Jalankan typecheck/lint/test/build, update status/README. Jangan memulai S3 atau membuat backend.
```

Gate: proyek JSON dengan ≥2 scene primitive dapat diimpor, seek tepat, render MP4 pendek; invalid JSON ditolak dengan error yang berguna dan tidak merusak proyek.

## Sesi 3 — Character, object library, motion dan AI guide

```text
Baca AGENTS.md, PRD.md, example-story.json dan IMPLEMENTATION_STATUS.md. Implementasikan S3, yaitu aset procedural 3D dan gerakan karakter, dengan desain stylized low-poly/clay yang konsisten dan ringan untuk mobile. Pertahankan engine S2 dan rendering S1.

Buat registry preset reusable: human, robot, cat, tree, house, rock. Gunakan geometri native Three.js, warna primary/secondary/accent yang dapat diatur; karakter punya head/body/limb yang benar-benar dapat bergerak, base origin di kaki, menghadap +Z. Gunakan group dan geometry/material reuse, batas internal mesh, segmen ringan, tidak ada aset remote dan texture besar. Buat variasi estetika dari komposisi bentuk, material, warna dan lighting; hindari hanya cube placeholder pada release.

Implementasikan aksi deterministik idle/walk/wave/jump berdasarkan local frame/fps dan speed. Limb animation tidak memindahkan root; locomotion melalui tracks position. Pastikan wave sesuai anatomi cat/human/robot, jump landing, rotation/scale dan parent group berjalan. Jangan pakai requestAnimationFrame/useFrame sebagai sumber waktu, physics nondeterministik atau external animation service. Tambahkan fixture yang menguji semua preset dan motion.

Validasi dan render example-story.json sebagai cerita 3 scene (15 detik). Perbaiki framing, kamera, clipping, captions safe area, konsistensi robot/objek. Periksa frame awal/tengah/akhir. Buat minimal satu demo edukasi/isometric tambahan. Buat public/ai-guide.md yang memuat kontrak JSON v1 lengkap, seluruh enum/field, batas, unit, action, contoh valid serta instruksi untuk ChatGPT: output JSON only, tidak mengarang field/preset, frame berdasarkan fps, karakter konsisten, target 15–30s/720p, jangan generate kode. Guide harus sinkron dengan schema aktual; test contoh dalam guide dan sediakan Copy AI Guide.

Jalankan test validation untuk example-story.json, motion evaluator, hierarchy, frame seek dan preview. Uji render singkat dan jika mampu full sample pada browser. Catat actual results; siapkan device manual test POCO F6. Update IMPLEMENTATION_STATUS.md. Jangan mengembangkan timeline drag/drop atau aset GLB dulu.
```

Gate: contoh 3-scene bisa dipreview dan schema guide valid; karakter benar-benar bergerak, kamera bergerak, caption tidak terpotong. Lakukan tes export 15 detik di HP jika baseline memungkinkan.

## Sesi 4 — UI mobile-first, project management dan import ChatGPT

```text
Baca AGENTS.md, PRD.md, example-story.json, IMPLEMENTATION_STATUS.md. Implementasikan S4: website siap digunakan sehari-hari dari HP tanpa setup tambahan. Jangan ganti engine yang sudah bekerja. Gunakan Tailwind, Lucide, Zustand dan Dexie sesuai PRD; jangan tambah router/komponen berat jika tidak diperlukan.

Desain studio clean dark slate (#0F172A, #1E293B, primary #2563EB, teal #0D9488), bukan landing page. Desktop: sidebar project/import, preview, inspector jika ruang cukup. Mobile: header pendek, preview dengan rasio tepat, controls play/pause/seek/timestamp, tab Story/Scenes/Audio, CTA export yang jelas. Lebar 360px tanpa overflow, controls touch min 44px, akses keyboard, error/status dapat dibaca. Audio tab dapat diberi label belum tersedia sampai S5; tidak boleh ada tombol aksi palsu.

Buat New/Open project, nama/rename/duplicate/delete with confirm, Load Demo, paste JSON, file import, Validate & Apply, Copy AI Guide, copy errors, Export JSON. Tampilkan error dengan field path dan scene; invalid import tidak overwrite project aktif. Scene list clickable seek ke frame awal scene; durasi dihitung dari schema. Jangan membangun full timeline editor. JSON tetap sumber utama; bila menambah form kecil, gunakan validator yang sama.

IndexedDB Dexie: persist dokumen tervalidasi dan metadata, auto-save debounce, restore reload, quota error, duplicate/delete transactions, clear warning bahwa data bersifat lokal dan bisa hilang jika clear browser data. Siapkan tabel audioAssets untuk S5. Jangan menggunakan localStorage untuk blob. Pisahkan UI state dan persisted data. Export JSON bukan menyertakan audio; jelaskan hal ini.

Integrasikan modal export dasar dari S1 ke UI baru, scene dimensions sesuai project aspect ratio, progress/cancel tetap berfungsi. Tambah Playwright tests: mobile/desktop, paste valid/invalid, load demo, seek, save/reload, duplicate, export/import JSON, no overflow. Perbaiki UX yang terlihat; jalankan typecheck/lint/test/build dan update status. Jangan menambah akun, backend, PWA atau API.
```

Gate: website bisa dipakai di HP untuk paste JSON ChatGPT, preview, simpan dan buka proyek, tanpa perlu membuka IDE. Export pendek masih berfungsi.

## Sesi 5 — Audio lokal dan export production-ready

```text
Baca AGENTS.md, PRD.md, IMPLEMENTATION_STATUS.md. Implementasikan S5. Prioritas: export MP4 lokal yang andal, audio opsional dan UX progress/error/cancel. Pertahankan komposisi yang sama untuk preview/export.

Audio: import maksimal satu file narration dan satu music MP3/WAV masing-masing ≤25 MiB; validasi decode/mime/size, simpan blob di IndexedDB audioAssets, manage object URLs, startFrame global, volume 0–1, remove/replace, crop di akhir project. Gunakan API @remotion/media yang didukung client-side rendering. Audio preview seek dan export harus sinkron. Jangan tambahkan TTS cloud atau menganggap speechSynthesis bisa direkam sebagai audio final. Jika AAC tidak didukung, beri opsi silent export atau alternatif container yang valid dengan consent, jangan drop audio diam-diam. Test persistence audio, invalid file, reload dan remove.

Export: 540p/720p/1080p dengan dimensi genap dan FPS sesuai project. Default 720p. Cek canRenderMediaOnWeb untuk container mp4/h264/audio AAC, resolusi, bitrate dan scale/config aktual. Fallback ke preset ringan; WebM opsional dengan label/extension yang benar. Gunakan AbortController, real progress, elapsed, ETA hanya berdasarkan throughput aktual, snapshot project/audio selama render, satu job per tab, cleanup finally. Pause/unmount preview jika dibutuhkan untuk mengurangi WebGL context. Download MP4 via getBlob atau streaming outputWritable jika didukung (cek signature versi). Jangan menyimpan semua frame ke RAM, tidak pakai FFmpeg WASM atau server render.

Tampilkan pesan context lost, unsupported codec, out of memory, quota, audio decode dan cancel, beserta retry yang berfungsi. Warn tab foreground/layar menyala dan heat; optional Screen Wake Lock feature detected dan release. Gunakan quality limits dan cleanup resource. Test export 5/10/15 detik dengan dan tanpa audio, validasi file playable/durasi/sync jika bisa. Lakukan tests cancel/retry/unsupported state tanpa mengarang keberhasilan. Sediakan diagnostic panel dengan data performance hasil render riil. Jalankan checks dan update status; catat pengujian POCO F6 yang perlu user lakukan.
```

Gate: MP4 720p dengan caption dan audio lokal berhasil jika perangkat mendukung AAC; bila tidak, limitation eksplisit dan silent MP4 masih bisa digunakan. Batal/retry tidak merusak project.

## Sesi 6 — QA, optimasi mobile dan deployment Cloudflare

```text
Baca AGENTS.md, PRD.md, IMPLEMENTATION_STATUS.md, inspect seluruh repository. Lakukan S6, release hardening. Jangan rewrite engine yang sudah bekerja dan jangan menambah fitur P1/P2 tanpa alasan.

Audit schema/guide/fixtures, determinisme timeline/seek, 3D rendering, state, local persistence, audio, export dan mobile accessibility. Cek memory: geometry/material lifecycle, object URL cleanup, no extra WebGL contexts, preview DPR, scene node budgets, dynamic import renderer jika membantu. Hindari heavy shadow/postprocessing. Profilkan berdasarkan pengukuran, bukan asumsi. Pastikan 360px mobile usable. Periksa security: strict JSON, tidak ada eval/user URLs/secrets, no API/backend routes, sanitasi input, file limits, errors yang jelas. Pastikan UI tombol benar-benar berfungsi.

Jalankan npm ci, typecheck, lint, Vitest, Playwright, production build. Perbaiki bug dan catat capability-gated skips jujur. Uji build dist lewat npm run preview. Cek setiap asset dist <25 MiB (Cloudflare Pages), bundled assets dan font, tidak ada runtime dependency CDN yang tak perlu. Tambahkan headers/CSP hanya jika sudah diuji kompatibel dengan blob/worker yang dibutuhkan renderer; jangan memblokir export. Review Remotion license sesuai pemakaian individual dan catat di README.

Buat README release: npm setup, scripts, browser support, workflow ChatGPT copy guide → JSON → paste → preview → import audio → export → download, deployment Direct Upload dist atau Git integration Vite (npm run build, dist), troubleshooting Android dan cara update. Tidak ada VPS. Jika tidak punya akses akun Cloudflare, jangan mengklaim deploy telah dilakukan; berikan instruksi tepat. Sediakan checklist fisik POCO F6 HTTPS: 720p30 5s/10s/15–30s, elapsed dan ukuran, playback, audio sync, cancel/retry, save/reload, repeat renders, 1080p5s optional. Tandai PASS/FAIL/NOT TESTED; jangan invent benchmark.

Buat RELEASE_CHECKLIST.md dan final IMPLEMENTATION_STATUS.md dengan fitur selesai, batasan, hasil test aktual dan blocker. Pastikan build final siap diupload. Berhenti setelah semua pekerjaan MVP yang dapat diverifikasi selesai.
```

Gate: dist siap deploy, semua check yang dapat dijalankan lulus, acceptance perangkat dicatat. Release akhir bergantung pada tes fisik POCO F6.

## Prompt troubleshooting — jika S1 gagal di HP

```text
Baca PRD, AGENTS, IMPLEMENTATION_STATUS. Jangan lanjut fitur lain. Berikut hasil pengujian nyata POCO F6: [paste browser version, screenshot/error, resolusi, FPS, waktu, apakah preview 3D berhasil]. Reproduksi sejauh mungkin. Isolasi secure context/WebGL2, ThreeCanvas still capture, WebCodecs H.264, AAC (jika dipakai), memory/context loss dan browser throttling. Uji konfigurasi codec dengan canRenderMediaOnWeb, demo 540p24/720p30 dan klip 1–5 detik. Perbaiki akar masalah tanpa cloud/API/server fallback. Verifikasi output aktual; dokumentasikan jika hanya WebM yang kompatibel dan jangan mengganti extension secara palsu. Jika jalur Remotion browser terbukti tidak bisa capture 3D pada target, buat technical spike minimal Three.js deterministic frame stepping + canvas + Mediabunny/WebCodecs sebagai alternatif lokal, bandingkan hasil sebelum mengganti engine. Update status dengan fakta dan langkah re-test yang dapat saya lakukan di HP.
```

## Prompt harian untuk membuat animasi (ChatGPT Pro biasa, bukan Codex)

Setelah S3/S4, tekan Copy AI Guide di Motion Studio, lalu berikan guide terbaru sebagai konteks ChatGPT. Prompt berikut dipakai setiap akan membuat cerita baru. Isi bagian dalam kurung siku. Tidak perlu menjalankan Codex atau deploy ulang untuk cerita yang hanya membutuhkan fitur yang telah tersedia.

```text
Kamu adalah sutradara storytelling 3D dan motion designer untuk Motion Studio. Patuhi AI Guide/schema JSON yang saya lampirkan di bawah. Aplikasi adalah renderer Three.js/Remotion lokal pada HP, bukan generator AI video.

Buat animasi dengan brief:
- Topik/cerita: [isi cerita]
- Durasi target: [mis. 30 detik]
- Rasio: [9:16]
- FPS: [30]
- Style: [stylized 3D colorful / low poly cinematic / isometric]
- Bahasa caption: [Indonesia]
- Target: TikTok/Shorts, hook kuat di awal, akhir jelas.

Rancang shot yang terhubung, variasi wide/medium/close-up, aksi sederhana yang masuk akal, gerak kamera halus, visual readable di layar HP. Pertahankan warna dan desain karakter serta properti di semua scene. Buat objek baru dari kombinasi primitive/group dan keyframe jika tidak ada preset. Gunakan hanya field, enum, geometry, preset dan action yang tertulis di AI Guide. Jangan mengarang jenis objek/efek di luar kontrak. Gunakan frame integer lokal per scene, frame 0 untuk track, end caption eksklusif, total durasi benar; hindari object clutter. Jangan memasukkan kode, URL eksternal, audio binary, komentar atau markdown. Hasil akhir satu JSON valid saja, siap diimpor. Bila ada permintaan di luar kemampuan engine, representasikan secara kreatif menggunakan fitur yang tersedia tanpa mengarang schema.

[PASTE AI GUIDE TERBARU DARI MOTION STUDIO DI SINI]
```

## Prompt revisi JSON ketika terjadi error

```text
Perbaiki JSON animasi berikut agar kompatibel dengan AI Guide Motion Studio. Pertahankan isi cerita, durasi, gaya, konsistensi karakter dan kamera semaksimal mungkin. Jangan menambah field atau preset tidak dikenal. Perbaiki seluruh validator errors, hitung ulang frame yang perlu dan periksa id/parentId/keyframes. Output hanya JSON valid lengkap, tanpa markdown.

AI Guide: [paste guide]
Error validator: [paste error]
JSON sebelumnya: [paste JSON]
```

## Prompt pengembangan preset baru (opsional setelah MVP)

```text
Baca AGENTS.md, PRD.md, engine schema, registry dan AI guide. Tambahkan preset procedural baru [nama/brief aset], dengan parameter warna terbatas yang sudah ada atau versi schema baru jika benar-benar diperlukan. Jaga determinisme, mobile budget dan kompatibilitas project lama. Tambahkan fixture/test, update schema/guide/registry, render preview dan jalankan checks. Jangan mengizinkan JavaScript arbitrary dari JSON. Siapkan build dist baru untuk redeploy Cloudflare.
```
