import { join } from 'path';

// Folder FISIK di disk tempat foto alamat disimpan.
// Dipisah dari folder avatar (public/uploads/avatar) karena secara
// domain ini bukan foto profil user, melainkan foto lokasi/alamat.
export const COURIER_PHOTO_UPLOAD_DIR = join(
    process.cwd(),
    'public',
    'uploads',
    'courier-photos',
);

// Prefix URL PUBLIK, harus selaras dengan app.useStaticAssets('public') di main.ts.
export const COURIER_PHOTO_URL_PREFIX = '/uploads/courier-photos';

// 2MB -- konsisten dengan batas avatar, silakan disesuaikan kalau
// kebutuhan foto alamat memang beda (mis. mau izinkan lebih besar).
export const MAX_COURIER_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

// Sama seperti avatar: validasi berdasarkan MIME type yang DIKLAIM
// client lewat header. Ini cuma filter cepat, bukan pengaman utama --
// pengaman sesungguhnya ada di assertValidAddressPhotoBuffer().
export const ALLOWED_COURIER_PHOTO_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/avif',
];
