# Motion Studio — Product Requirements Document

Version 1.0 | 24 November 2026 | Status: implementation-ready MVP specification

## 1. Ringkasan produk

Motion Studio adalah website statis untuk membuat video storytelling dan motion graphics 3D yang benar-benar dirender secara lokal melalui Chrome Android atau browser desktop. Target awal adalah penggunaan pribadi pada POCO F6 (Snapdragon 8s Gen 3 / Adreno 735) dan laptop Windows. Pengguna membuat instruksi animasi menggunakan ChatGPT Pro atau Codex, kemudian menempel atau mengimpor JSON ke aplikasi. Tidak ada integrasi API AI pada runtime. Website tidak menghasilkan video melalui Veo/Kling, tidak mengirim proyek ke server dan tidak memerlukan GPU cloud.

Model 3D dibuat dari geometri Three.js dan komponen procedural yang reusable. AI dapat mendefinisikan komposisi, objek, hierarki, warna, transformasi, keyframe, preset karakter, aksi, kamera, pencahayaan dan caption melalui kontrak JSON. Preview dan render menggunakan komposisi yang sama. Output utama MP4 H.264; audio AAC jika tersedia. Hosting hanya menyajikan file statis. Nama Motion Studio bersifat sementara.

## 2. Tujuan, batasan, dan kriteria sukses

### Tujuan
- Dari ChatGPT ke preview dengan satu kali copy-paste JSON atau import file, tanpa coding untuk setiap video biasa.
- Menghasilkan 3D sungguhan (perspektif/orthographic, depth, material, lighting, objek dan kamera 3D), bukan kumpulan gambar AI yang digerakkan.
- Satu jalur rendering pada desktop dan mobile, dengan pengaturan kualitas yang dapat diturunkan.
- Tidak ada biaya API AI, backend, VPS, cloud GPU atau database server. Biaya listrik, perangkat, koneksi dan langganan ChatGPT yang sudah ada tidak dihitung sebagai biaya baru.
- MVP cepat, stabil, mobile-first; kemampuan lebih penting daripada editor kompleks.

### Non-goals MVP
- Login, billing, multi-user, server sync, SaaS, APK/PWA, service worker, backend, API key, Worker/Pages Functions, R2, database cloud.
- Menjalankan JavaScript/TSX dari JSON, auto-login ke ChatGPT, scraping sesi atau menganggap subscription ChatGPT sebagai API.
- Full visual node editor, timeline drag-and-drop kompleks, physics engine, rigging/mocap, generative video/image, asset marketplace, lip sync, auto TTS atau ekspor proyek Blender.
- Tidak menjanjikan kualitas Pixar/realistis atau durasi render tertentu pada perangkat yang belum diuji.

### Definisi MVP selesai
- Test fisik POCO F6: demo 5–10 detik 720×1280, 30 FPS, animasi 3D, menghasilkan file MP4 yang bisa diputar dan mempunyai durasi sesuai. Rekam hasil, bukan sekadar preview.
- Proyek cerita ≥3 scene, total 15–30 detik dengan beberapa objek 3D, karakter tetap, kamera bergerak, caption dan aksi sederhana, preview serta seek berjalan; ekspor 720p sukses di perangkat target.
- Satu proyek dapat dibuat lewat paste JSON, disimpan lokal, dipulihkan setelah reload, dan diekspor kembali sebagai JSON.
- Audio lokal opsional (minimal satu track narasi dan satu musik), seek/preview sinkron, export audio+video bila konfigurasi H.264/AAC didukung.
- 1080×1920 dan hingga 60 detik merupakan target lanjutan yang ditawarkan jika lolos capability check serta benchmark; bukan syarat lulus awal di HP.
- Tidak ada tombol palsu. Build produksi lolos, deployment static berjalan melalui HTTPS. Semua pengujian yang belum dilakukan pada HP ditandai NOT TESTED.

## 3. Alur pengguna

### Setup sekali saja (laptop)
1. Codex mengimplementasikan aplikasi dari PRD, AGENTS dan prompt sesi.
2. `npm ci`, `npm run dev`, tes, `npm run build`.
3. Deploy isi `dist/` ke Cloudflare Pages melalui Direct Upload atau Git integration (pilih salah satu dari awal).
4. Buka alamat `https://<project>.pages.dev` melalui Chrome POCO F6, lakukan benchmark. Laptop tidak perlu tetap hidup.

### Produksi video (HP atau laptop)
1. Buka Motion Studio, pilih New Project atau Import JSON.
2. Tekan Copy AI Guide. Buka ChatGPT dan berikan guide terbaru + ide cerita, genre, durasi, rasio dan bahasa. ChatGPT menghasilkan JSON sesuai versi kontrak; jangan meminta JS untuk diimpor.
3. Paste JSON atau pilih file `.json`. Aplikasi parse dan validasi tanpa mengeksekusi kode. Bila invalid, tampilkan error dengan path, copy error untuk meminta ChatGPT memperbaikinya. Proyek lama tidak tertimpa bila import gagal.
4. Preview 3D, play/pause/seek, pilih scene. Ubah judul, teks caption, durasi lewat mode JSON atau panel sederhana jika ada. Simpan otomatis.
5. (Opsional) Import narasi MP3/WAV dan musik lokal. Tidak ada TTS API; pengguna merekam sendiri atau memasukkan audio yang sudah dimiliki. SpeechSynthesis bukan jalur encoding final yang diasumsikan.
6. Pilih export preset (default 720p/30 FPS), jalankan pemeriksaan codec, render di tab yang tetap aktif, lihat progress dan batalkan jika diperlukan.
7. Setelah selesai, tekan Download MP4. Chrome menyimpan ke folder unduhan; pengguna dapat membuka video/berbagi. Aplikasi tidak menjanjikan akses langsung ke galeri.

## 4. Arsitektur

```
ChatGPT (subscription, manual)
    | paste/upload JSON (data only)
Static website on Cloudflare Pages / Chrome
    | Zod + semantic validation
    | normalized ProjectDocument v1 + local store
    +--> Remotion composition --> Player preview
    |         +-- ThreeCanvas / R3F / Three.js
    |         +-- scene registry, keyframes, lights, camera
    |         +-- caption + local audio
    +--> same composition --> @remotion/web-renderer
              --> WebCodecs / Mediabunny (local encoding)
              --> Blob or supported streaming target --> MP4 download
    +--> IndexedDB project metadata and audio blobs (on-device)
```

Cloudflare menyimpan dan menyajikan bundle dan aset bawaan, bukan menjalankan rendering. Node.js hanya dibutuhkan pada mesin development/build. Tidak ada network call ke LLM. Runtime tidak bergantung pada CDN aset/font eksternal; semua aset MVP dibundel sendiri. Remotion dapat memiliki mekanisme telemetry/lisensi sesuai versi; verifikasi pengaturan resminya sebelum mengklaim zero-network. Jangan klaim offline permanen tanpa service worker; setelah halaman dan aset termuat, tidak boleh membutuhkan backend untuk menyelesaikan render.

### Stack wajib
| Layer | Teknologi |
|---|---|
| UI | React, TypeScript strict, Vite, Tailwind CSS, Lucide React |
| State | Zustand (ephemeral UI state; jangan persist blob lewat localStorage) |
| Validasi | Zod + semantic rules |
| 3D | three, @react-three/fiber, @remotion/three; drei hanya bila perlu |
| Composition/preview | remotion, @remotion/player |
| Render/encoding | @remotion/web-renderer, WebCodecs (Mediabunny internal) |
| Audio | @remotion/media |
| Local persistence | Dexie + IndexedDB |
| QA | Vitest, Playwright Chromium, manual Android Chrome |
| Build | npm lockfile, Node LTS yang kompatibel, static dist |

Gunakan versi stabil yang kompatibel. Semua paket `remotion` dan `@remotion/*` harus exact version yang sama; dokumentasikan React/R3F/Three peer dependencies. Jangan memakai package renderer server-side/FFmpeg WASM untuk jalur utama. Jangan menebak signature API; cocokkan dokumentasi dan TypeScript package yang diinstal. `ThreeCanvas` disinkronkan dengan frame Remotion; animasi memakai `useCurrentFrame()` dan `useVideoConfig()`, bukan `useFrame()` berbasis realtime. Untuk scene, satu ThreeCanvas aktif pada satu waktu dan caption/audio di luar canvas. Jangan memasukkan DOM ke dalam tree R3F.

### Fallback teknis
- Bila codec H.264 tidak didukung, coba preset 540p/720p dan FPS 24; cek ulang dengan kemampuan browser. Jika diperlukan, tawarkan WebM secara eksplisit sebagai format alternatif (bukan file WebM bernama MP4).
- Bila ekspor ThreeCanvas pada perangkat gagal, pisahkan masalah WebGL vs encoding vs memory. Uji canvas/encoder sederhana, test `renderStillOnWeb` dan render pendek. Jangan membangun fitur lanjutan sebelum masalah baseline dicatat.
- Jalur cadangan fase berikutnya: Three.js renderer + canvas capture + Mediabunny/WebCodecs langsung, dengan evaluasi frame deterministik dan overlay canvas. Tetap lokal; gunakan hanya jika jalur utama tidak dapat berjalan. Jangan membangun dua engine paralel sejak hari pertama.

## 5. Fitur fungsional

| ID | Fitur | Prioritas | Acceptance criteria |
|---|---|---|---|
| F01 | Device diagnostics / demo export | P0 | Detect secure context, WebGL2, VideoEncoder dan kemampuan format/preset; demo 3D 5–10 detik; download MP4 lokal atau error jujur |
| F02 | Import JSON | P0 | Paste, file upload, validate, clear errors, contoh; file invalid tidak mengubah proyek aktif; input panjang dibatasi |
| F03 | AI guide | P0 | Copy guide yang sesuai schema dan preset aktual, termasuk contoh valid, batas kompleksitas dan instruksi repair |
| F04 | Scene engine | P0 | Scene berurutan tanpa gap; objek mesh/preset/group, parent, transform, lighting, ground, fog; timeline frame-based |
| F05 | Motion/keyframes | P0 | Transform dan kamera animasi; hold/interpolation/easing; seek ke frame sama menghasilkan state sama |
| F06 | Asset registry | P0 | human, robot, cat, tree, house, rock; procedural geometry yang konsisten, warna dapat diatur; primitive mesh tetap tersedia |
| F07 | Karakter | P0 | Preset karakter dengan aksi idle/walk/wave/jump; gerakan limb sederhana; posisi root melalui keyframe terpisah |
| F08 | Preview & timeline | P0 | Player, play/pause/seek, scene selection, durasi, loading/error; mobile layout tanpa overflow |
| F09 | Local projects | P0 | Save/open/rename/duplicate/delete dengan konfirmasi; restore reload; export/import JSON; audio tersimpan terpisah |
| F10 | Export MP4 | P0 | 540/720/1080p preset, 24/30 FPS sesuai timeline proyek; check codec, progress nyata, cancel, retry, file playable, hasil lokal |
| F11 | Captions | P0 | Timed overlay, top/bottom, warna/ukuran terbatas, safe area dan font bundled/system |
| F12 | Audio manual | P0 setelah silent baseline | Import MP3/WAV, narration + music, start frame dan volume; preview/export sinkron; error AAC bila tidak tersedia |
| F13 | Mobile performance | P0 | Pixel ratio terkendali, memory/size budgets, shadow sederhana, lifecycle resource cleanup, foreground render warning |
| F14 | Settings/diagnostics | P1 | Quality preset, render stats, test codec, copy diagnostics tanpa private project content |
| F15 | Scene editing ringan | P1 | Rename/reorder/duplicate scene dan update caption melalui form; JSON sebagai sumber utama; jangan membuat full timeline editor |
| F16 | Import/export bundle audio+JSON | P1 | Project ZIP dengan manifest aman, jika diperlukan untuk transfer perangkat |
| F17 | GLB library, rigged animation, advanced fx | P2 | Setelah MVP; local assets only, licensed, compressed, tested |

P0 wajib untuk release final sesuai definisi; sesi 1 hanya F01. P1/P2 tidak boleh menghambat MVP. Jika audio encoder HP gagal, silent export tetap tersedia dan status audio ditampilkan eksplisit; release dinyatakan terbatas, bukan semua fitur lulus.

## 6. UI/UX

### Halaman utama (single page, tanpa router bila tidak perlu)
- Header: Motion Studio, nama proyek, status lokal, tombol New/Open, Export.
- Area utama: player dengan aspect ratio benar; preview tidak memenuhi seluruh viewport jika mengganggu kontrol. Play/pause, scrubber, timestamp, scene count, fullscreen browser opsional.
- Desktop: panel input/project kiri, preview tengah, inspector/export kanan jika ruang cukup. Mobile: layout satu kolom, preview di atas, tab Story / Scenes / Audio; export CTA jelas.
- Story: textarea JSON monospace, Import File, Validate & Apply, Copy AI Guide, Load Demo, error path dan nomor scene; tombol copy error.
- Scenes: daftar scene dengan durasi dan thumbnail opsional; klik seek ke start frame. Total frame dari jumlah durasi.
- Audio: slot narasi dan musik, file name, start offset, volume slider, remove, status ready. Jangan tampilkan tombol auto voice yang tidak bekerja.
- Projects: list lokal, rename, duplicate, delete confirmation, export JSON.
- Export modal: format, resolusi, FPS proyek, perkiraan total frame, warnings, actual progress dan elapsed time, cancel, completion download, retry. Estimasi ETA hanya setelah throughput aktual tersedia; bukan janji.
- Device diagnostics: WebGL2, encoder supported config, browser, resolusi, test export; jelaskan fallback.

Visual: dark slate #0F172A / surface #1E293B, primary #2563EB, accent teal #0D9488, neutral text kontras tinggi; clean creative-tool UI, tanpa dekorasi berlebihan. Mobile controls min 44px, support keyboard desktop, fokus visible, status/error tidak hanya warna, layar 360px tanpa horizontal scroll. UI utama boleh responsive CSS; hanya CSS yang dirender ke video mengikuti dukungan web renderer.

## 7. Kontrak JSON v1 (sumber kebenaran)

Dokumen `example-story.json` adalah fixture referensi. Implementasi schema dan AI guide harus konsisten dengan kontrak ini. Perubahan breaking memerlukan schemaVersion baru, migrasi eksplisit dan update guide/fixtures. Sesi 2 membangun validator ketat; sesi 3 melengkapi semua preset v1. Semua angka harus finite. Unknown keys ditolak, bukan diam-diam diabaikan. Gunakan Zod discriminated unions dan semantic checks lintas field; hasil normalisasi memakai default deterministik. Bukan schema untuk arbitrary code.

### Root
- `schemaVersion`: literal `1`.
- `title`: string 1–100 karakter.
- `aspectRatio`: `9:16` | `16:9` | `1:1`. Default baru `9:16`.
- `fps`: 24 | 30. Project FPS immutable selama export; untuk mengubah, ubah proyek dan skala seluruh frame index secara eksplisit (fitur P1). Preset export hanya mengubah resolusi.
- `scenes`: array 1–12. Total `durationFrames` ≤ fps × 60 (hard limit MVP; default/target 15–30 detik). Scene disusun menurut urutan array.

### Scene
- `id`: unik di proyek, `[a-zA-Z0-9_-]{1,64}`; `name`: string 1–80.
- `durationFrames`: integer 1–fps×60. Semua frame dalam scene mulai 0; end eksklusif.
- `world`: `background` (#RRGGBB), `ground` (boolean), `groundColor` (#RRGGBB), opsional `fog` {`color`, `near` positif, `far` > near}. Ground adalah plane XZ di y=0. Ground/shadow optional quality.
- `lighting`: `ambient` {`color`, `intensity` 0–3}, `directional` {`color`, `intensity` 0–5, `position` vec3}; optional `fill` dengan bentuk directional sama. Default maksimum dua directional; satu shadow casting pada kualitas tinggi. Sesi 2 bisa memakai default jika field lighting tidak ada.
- `camera`: `type` `perspective` | `orthographic`, `keyframes` (1–100; frame 0 wajib), setiap keyframe {`frame`, `position`, `target`, `fov`, `orthoSize`, `ease`}. `fov` hanya untuk perspective 15–90 derajat, `orthoSize` hanya orthographic 1–100, field irrelevant boleh tidak ada. Defaults 45 dan 10. Posisi ≠ target. Gunakan lookAt dan update projection. Untuk MVP camera type tidak berubah di tengah scene.
- `nodes`: array 1–100, id unik per scene, parent graph acyclic.
- `captions`: opsional array 0–30 {`startFrame`, `endFrame`, `text`, `placement`: `top`|`bottom`, `color` opsional, `fontSize` opsional 24–100 dalam skala design 1080px}. End eksklusif, start < end ≤ durationFrames, text max 160 karakter, overlap ditolak. Render di layer 2D dalam safe area.
- Transisi antar scene: hard cut MVP. Fade via overlay lokal dapat ditambahkan P1, jangan mengandalkan overlap antar scene tanpa menghitung timeline.

### Node
Common fields:
- `id`, `parentId` opsional (id node lain dalam scene), `kind`: `group` | `mesh` | `preset`.
- `position` vec3 default [0,0,0], `rotation` vec3 derajat default [0,0,0], `scale` vec3 positif default [1,1,1]. Y up, ground XZ, karakter menghadap +Z. Koordinat dunia practical ±100; parent transform lokal. Rotasi Euler XYZ dikonversi ke radians.
- `tracks` opsional array ≤3, satu per property: {`property`: `position` | `rotation` | `scale`, `keyframes`: [{`frame`, `value`: vec3, `ease`?: `linear` | `easeIn` | `easeOut` | `easeInOut` | `step`}]}. Frame integer unik dan meningkat, frame 0 wajib jika track ada, frame < durationFrames; 1–120 keyframe per track; property tanpa track memakai base transform; sebelum/di/selepas keyframe valid gunakan interpolasi atau hold. Ease dari keyframe tujuan berlaku pada segmen menuju keyframe itu. Rotasi adalah nilai derajat langsung (tidak shortest-path otomatis). `scale` 0.01–50.

`kind: group`: tidak ada geometry/preset/material; children hanya ditentukan lewat parentId.

`kind: mesh`:
- `geometry`: discriminated union `{type:"box",size:[w,h,d]}`, `{type:"sphere",radius}`, `{type:"cylinder",radiusTop,radiusBottom,height}`, `{type:"cone",radius,height}`, `{type:"capsule",radius,length}`, `{type:"torus",radius,tube}`. Dimensi >0 dan ≤50; cylinder radius boleh nol jika radius lainnya positif. Segments internal engine, tidak dikontrol JSON.
- `material`: {`color`: #RRGGBB, `roughness`?: 0–1 (default .8), `metalness`?: 0–1 (default 0), `emissive`?: #RRGGBB, `emissiveIntensity`?: 0–2}. MeshStandardMaterial. No custom shaders/URLs. Group scale memengaruhi anak.

`kind: preset`:
- `preset`: `human` | `robot` | `cat` | `tree` | `house` | `rock`.
- `colors`: opsional {`primary`, `secondary`, `accent`} warna hex; gunakan default registry jika kosong. Base character origin di kaki/ground dan menghadap +Z; material reusable.
- `action` opsional {`name`: `idle` | `walk` | `wave` | `jump`, `speed`: 0.25–3}. Hanya `human`, `robot`, `cat` yang dapat action. Aksi menggerakkan limb/badan lokal, tidak mengubah posisi root. `jump` lift lokal dengan landing. `wave` implementasi yang masuk akal per model; bila tidak tersedia cat wave gunakan paw gesture yang didokumentasikan. Phase ditentukan dari local frame / fps × speed. Satu aksi per node per scene; untuk berganti aksi, split scene atau implementasikan action tracks di v2. Jangan mengklaim IK/rigging kompleks.

### Format yang sengaja tidak disediakan
Tidak ada `script`, `code`, `js`, `html`, fungsi, `eval`, remote URL, fetch atau dependency name. AI bebas membuat bentuk baru dengan group + primitive mesh + transform/keyframes; style terikat pada vocabulary. Bila ingin model/efek di luar vocabulary, gunakan Codex untuk menambahkan preset/fitur ke source code dan deploy ulang. Ini adalah perbedaan utama antara sistem JSON aman dan workflow Claude yang menulis TSX bebas setiap video.

Audio files bukan bagian dari story JSON v1. Simpan attachment sebagai `LocalAudioTrack` terpisah `{id, role: narration|music, blob, mime, name, startFrame, volume}`; startFrame global proyek; crop pada akhir komposisi; satu per role, volume 0–1, max 25 MiB per file. Ekspor JSON tanpa audio memberi notifikasi eksplisit; bundle ZIP P1.

## 8. Rendering & performance

- Preview: `@remotion/player` dengan komposisi `StoryComposition` yang sama dengan export, `inputProps` berisi project tervalidasi dan audio URLs lokal yang dipersiapkan. Jangan buat animasi terpisah untuk preview dan export. Ukuran tampilan CSS bisa kecil tanpa mengubah frame output; preview low-res mode boleh mengurangi resolution canvas secara konsisten.
- Scene selection dari cumulative starts; `Sequence` memberi frame relatif; pastikan keyframes, caption, action memakai local frame dan audio global frame. Jangan menggunakan wall clock, `Date.now()` / `Math.random()` untuk animasi atau physics incremental. Bila perlu seeded PRNG stabil per id.
- 3D: geometry/material disposal pada lifecycle yang tepat; gunakan resource sharing; jangan membangun mesh/material baru per frame. Shadow default off/cheap contact shadow; lighting sederhana, tanpa bloom/SSR/DOF berat. Hindari post-processing, environment map besar, dynamic texture, particles masif. Limit awal 100 node/scene, max 12 scene, max 60 s; node preset dapat menghasilkan banyak draw call sehingga cap internal mesh dan uji budget aktual. Preview DPR ≤1 pada mobile. Profiling berdasarkan hasil device, bukan angka asumsi.
- Output: 540/720/1080p (sisi pendek untuk landscape/portrait/square, dimensi genap); `9:16`: 540×960, 720×1280, 1080×1920; `16:9`: kebalikan; `1:1`: sisi yang sama. H.264 MP4, AAC audio jika ada. Default 720p, 30 FPS untuk proyek baru, 540p fallback. Jangan resample FPS diam-diam.
- Preflight: HTTPS/localhost, WebGL2, `VideoEncoder`, `canRenderMediaOnWeb` dengan config exact (cek API versi), audio codec bila ada, dukungan File System Access hanya jika tersedia. Hardware encoding prefer-hardware merupakan preferensi, bukan jaminan. Tampilkan capability real; jangan klaim GPU terverifikasi dari codec saja.
- Render: dynamic import `@remotion/web-renderer` jika sesuai; `renderMediaOnWeb({composition,inputProps,container:'mp4',videoCodec:'h264',...})`, progress dari callback yang benar, `signal` AbortController, output `getBlob()` atau `outputWritable` jika support (pilih salah satu). Sesuaikan dengan versi yang dipasang. Hasil disimpan lewat user-initiated download; revoke object URL setelah tidak digunakan. Jangan simpan ribuan frame di RAM, jangan export via screen recording realtime sebagai jalur utama. Pause/unmount player saat export jika perlu untuk mencegah dua WebGL context berat; snapshot immutable proyek dan audio refs sampai render selesai.
- Render panel: preflight → preparing → rendering/encoding → done/error/cancelled. Satu job per tab, lock edit selama render atau snapshot terpisah. Progress tidak direkayasa; ETA dari throughput aktual; cancel tidak harus instan. Warn keep browser foreground/screen awake. Screen Wake Lock optional feature detection dan release di finally. Tidak menjanjikan render background atau resume setelah tab dimatikan.
- Kesalahan: unsupported encoder, failed asset load, context lost, storage quota, invalid project, cancel, browser reload, audio decode; pesan Indonesia yang actionable, state bisa retry. Tawarkan resolusi lebih rendah. Jangan otomatis mengunggah ke server sebagai fallback.

## 9. Local data & security

IndexedDB (Dexie) `projects` dan `audioAssets` dengan version migration. ProjectRecord: id, title, document, createdAt, updatedAt; audio refs keyed by projectId/role. Use local ID stable (crypto.randomUUID) dan transaction untuk delete/duplicate. Autosave debounced 500–1000 ms hanya proyek valid; indicator saving/saved/error. Handle quota; local data bisa terhapus saat browser clear storage/eviction, maka Export JSON penting. Website publik tidak berarti proyek publik, tetapi siapa pun yang memiliki URL bisa membuka tool; tidak ada akses-control pribadi. Jika butuh privasi akses di masa depan pertimbangkan Cloudflare Access sebagai scope terpisah.

Strict JSON.parse + Zod dan semantic checks, input JSON max 1 MiB, error message path, finite values, clamp bukan silent mutation. Jangan eval, Function, dynamic import dari user input, remote URL, dangerouslySetInnerHTML, JSX compiler atau kode arbitrary. React escape text, asset refs internal only. Cegah prototype pollution dengan strict schema dan hindari merge untrusted object ke arbitrary targets. No secrets dalam Vite env/client, no API keys/cookies ChatGPT. MIME sniff/decode local audio secara defensif; batasi jumlah/durasi/ukuran. Release blob URLs/contexts/audio when no longer used. Tambahkan CSP yang kompatibel setelah diuji, terutama worker/blob yang dibutuhkan encoder; jangan memblokir runtime tanpa test. Aset pihak ketiga harus berlisensi; MVP memakai procedural geometry.

## 10. Struktur repository

```
AGENTS.md
PRD.md
README.md
IMPLEMENTATION_STATUS.md
package.json / package-lock.json
public/
  ai-guide.md               # generated/synced with supported contract
src/
  app/                      # App, responsive shell
  components/               # UI controls
  features/
    projects/               # import, store, persistence
    editor/                 # JSON input, scene list, player controls
    audio/                  # local files, track config
    export/                 # preflight, renderer adapter, download
  engine/
    schema/                 # Zod, semantic validation, normalize
    timeline/               # scene ranges, interpolation, easing
    composition/            # StoryComposition and scene component
    scene/                  # graph, mesh, lighting, camera, captions
    assets/                 # preset registry & procedural models
    motion/                 # deterministic actions
  lib/                      # storage, capabilities, helpers
  examples/                 # valid fixture, diagnostic scene
  tests/                    # pure unit tests
 e2e/                       # browser tests
```

Separate engine from UI. Typed interfaces for validator, timeline and rendering adapter. No huge monolithic App.tsx. Keep dependency count small. No server/API routes.

## 11. QA plan & release checklist

Automated unit: schema unknown fields/version; JSON malformed; invalid scene total, duplicate id, missing parent/cycle, unsupported kind/preset, nonfinite/out-of-range transform; keyframe ordering/out-of-range; interpolation at first, middle, final, out-of-order seeking; scene boundary correct; caption timing; resolution dims; persistence migrations. Integration: sample project import, preview seek, save/reload, JSON export reimport; invalid import preserves previous state; audio add/remove/restore and errors; export modal unsupported state/cancel path. Playwright on Chromium: mobile viewport 360×800, desktop, no horizontal overflow, accessible buttons, demo import, seek and actual short render where environment supports; capability-gated tests explicitly skipped with reason, not false success. Compare selected preview/export frames on device; ensure no black canvas, missing scene or caption.

Manual Android acceptance (Chrome updated, HTTPS site): run demo 720p30 5s and 10s, record wall time, throughput, size, video duration, visible quality, playback, crash/heat perception, encoder setting/result. Then sample 15–30s; add audio and verify sync; cancel & rerender; reload projects; try 1080p 5s only after baseline; keep tab foreground. Repeat render 2–3 times to detect leaks. Record PASS/FAIL/NOT TESTED plus browser/OS/device details; do not make up numbers. User can run locally from deployed URL. No claim of reliable 1080p/60s before actual test.

### Release checklist
- [ ] npm ci, typecheck, lint, test, build all pass.
- [ ] Exact remotion versions aligned, no untracked dependencies; static dist assets each <25 MiB.
- [ ] Build opens without server backend, production console no unexplained errors.
- [ ] Demo export playable on POCO F6, 720p baseline verified.
- [ ] JSON guide matches exact schema & registry; example validates; invalid import handled.
- [ ] 3-scene preview, seek, export, persistence verified; mobile no overflow.
- [ ] Audio preview/export verified if AAC supported; limitation explicit if not.
- [ ] Cancel and retries work; error actionable, no data upload.
- [ ] README deployment, daily workflow, known limitations and diagnostic guide.

## 12. Deployment Cloudflare Pages

Build locally `npm ci && npm run build`; verify `npm run preview` on laptop. Node version pin to compatible LTS via `.nvmrc` or documentation. Direct Upload: Cloudflare dashboard → Workers & Pages → create Pages project → Direct Upload → upload `dist` contents using UI or documented Wrangler Pages command. No Pages Functions. If using Git integration instead, connect repo, build command `npm run build`, output directory `dist`, root project, no environment secrets. HTTPS `pages.dev` allows secure-context APIs; LAN HTTP is not sufficient for WebCodecs tests. Choose a suitable available project name. Use public URL on POCO F6, run physical test. Hosting free limits apply (single asset 25 MiB). Do not claim deployment completed without actual Cloudflare account access. For development on LAN `npm run dev -- --host 0.0.0.0` can preview on phone but use HTTPS Pages or local trusted HTTPS for export test.

## 13. Milestone

S1 Proof of concept 3D→MP4 + early device test. S2 JSON engine/validation/timeline. S3 Asset/motion library + storytelling fixtures + AI guide. S4 Responsive UI/projects/import persistence. S5 Audio and export robustness. S6 QA, performance & release. Proceed by acceptance gate; do not ask agent to implement everything in one request. No need to build APK or backend.

## 14. Official references (verified 24 Nov 2026)
- https://www.remotion.dev/docs/client-side-rendering/
- https://www.remotion.dev/docs/three-canvas
- https://www.remotion.dev/docs/client-side-rendering/limitations
- https://www.remotion.dev/docs/web-renderer/render-media-on-web
- https://www.remotion.dev/docs/license/faq (free license eligible individuals/small teams; check terms if distributed commercially)
- https://developers.cloudflare.com/pages/platform/limits/
- https://vite.dev/guide/static-deploy.html
