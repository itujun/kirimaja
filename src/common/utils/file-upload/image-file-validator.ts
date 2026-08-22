import { UnsupportedMediaTypeException } from '@nestjs/common';
import { fromBuffer } from 'file-type';

export interface DetectedFileType {
    ext: string;
    mime: string;
}

// Mekanisme GENERIK untuk validasi isi file gambar (magic bytes),
// dipakai oleh module manapun yang butuh terima upload gambar
// (profile/avatar, user-addresses/photo, dst).
//
// SENGAJA menerima `allowedMimeTypes` sebagai parameter, BUKAN
// hardcode di sini -- karena daftar mime type yang diizinkan itu
// keputusan/kebijakan milik masing-masing domain (avatar boleh beda
// aturan dari foto alamat), bukan bagian dari mekanisme validasinya.
//
// Validasi berdasarkan ISI file yang sesungguhnya (dibaca dari byte
// pertama file), BUKAN dari originalname atau mimetype yang diklaim
// client lewat header -- keduanya gampang dipalsukan.
export async function assertValidImageBuffer(
    buffer: Buffer,
    allowedMimeTypes: string[],
): Promise<DetectedFileType> {
    const detected = await fromBuffer(buffer);

    if (!detected || !allowedMimeTypes.includes(detected.mime)) {
        throw new UnsupportedMediaTypeException(
            `File is not a valid image. Allowed types: ${allowedMimeTypes.join(', ')}`,
        );
    }

    return detected;
}
