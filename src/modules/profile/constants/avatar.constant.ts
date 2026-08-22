import { join } from 'path';

// Folder FISIK di disk tempat file avatar disimpan.
// Dipakai oleh Multer (destination) dan oleh ProfileService saat
// menghapus file avatar lama. Pakai process.cwd() (bukan path relatif
// './public/...') supaya tidak bergantung pada dari direktori mana
// proses Node dijalankan.
export const AVATAR_UPLOAD_DIR = join(
    process.cwd(),
    'public',
    'uploads',
    'avatar',
);

// Prefix URL PUBLIK yang dikembalikan ke client, harus selaras dengan
// app.useStaticAssets('public') di main.ts.
export const AVATAR_URL_PREFIX = '/uploads/avatar';

// Maksimal ukuran file avatar yang diterima: 2MB.
// Tanpa batas ini, endpoint upload rawan disalahgunakan untuk
// menghabiskan disk server (DoS sederhana).
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

// Validasi berdasarkan MIME type asli file (dibaca dari header multipart),
// BUKAN dari ekstensi nama file -- nama file gampang dipalsukan
// (mis. "virus.exe" di-rename jadi "virus.jpg").
export const ALLOWED_AVATAR_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/avif',
];
