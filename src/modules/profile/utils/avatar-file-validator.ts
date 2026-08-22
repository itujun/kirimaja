import { UnsupportedMediaTypeException } from '@nestjs/common';
import { fromBuffer } from 'file-type';
import { ALLOWED_AVATAR_MIME_TYPES } from '../constants/avatar.constant';

export interface DetectedFileType {
    ext: string;
    mime: string;
}

// PENTING: package `file-type` SENGAJA dipin ke versi 16.5.4 di
// package.json (bukan versi terbaru). Sejak versi 17, package ini jadi
// pure ESM dan bikin TypeScript project ber-moduleResolution "node"
// (default NestJS) gagal me-resolve tipenya saat compile (TS2307),
// karena resolver "node" klasik tidak paham field "exports" di
// package.json milik package ESM murni.
//
// Versi 16.5.4 adalah rilis CommonJS terakhir sebelum migrasi itu --
// bisa diimpor seperti biasa tanpa dynamic import(), dan API-nya
// (fromBuffer) tetap mengembalikan bentuk { ext, mime } yang sama.
async function detectFileType(
    buffer: Buffer,
): Promise<DetectedFileType | undefined> {
    return fromBuffer(buffer);
}

// Validasi ISI file (magic bytes: beberapa byte pertama yang menandai
// format sebenarnya), BUKAN metadata yang dikirim client (originalname,
// header Content-Type / mimetype) -- keduanya gampang dipalsukan dari
// sisi client karena cuma string yang mereka set sendiri di request.
//
// Melempar UnsupportedMediaTypeException (415) kalau:
// - file-type gagal mendeteksi format sama sekali (buffer bukan file
//   biner yang dikenali -- termasuk kalau ternyata itu file teks/script
//   yang di-rename jadi .jpg), ATAU
// - format yang terdeteksi bukan salah satu dari daftar yang diizinkan.
export async function assertValidAvatarBuffer(
    buffer: Buffer,
): Promise<DetectedFileType> {
    const detected = await detectFileType(buffer);

    if (!detected || !ALLOWED_AVATAR_MIME_TYPES.includes(detected.mime)) {
        throw new UnsupportedMediaTypeException(
            `File is not a valid image. Allowed types: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
        );
    }

    return detected;
}
