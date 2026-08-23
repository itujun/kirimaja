import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
    private readonly uploadsPath = 'public/uploads/qrcodes';

    constructor() {
        if (!existsSync(this.uploadsPath)) {
            mkdirSync(this.uploadsPath, { recursive: true });
        }
    }

    async generateQrCode(trackingNumber: string): Promise<string> {
        try {
            // Sanitasi: trackingNumber bisa berisi karakter yang tidak aman
            // untuk dipakai sebagai nama file (mis. '/' pada fallback "N/A"),
            // yang oleh OS dibaca sebagai pemisah folder dan menyebabkan
            // ENOENT. Ganti semua karakter selain alfanumerik/-/_ dengan '_'.
            const safeTrackingNumber = trackingNumber.replace(
                /[^a-zA-Z0-9-_]/g,
                '_',
            );

            const fileName = `${safeTrackingNumber}_${Date.now()}.png`;
            const filePath = join(this.uploadsPath, fileName);

            await QRCode.toFile(filePath, trackingNumber);

            return `uploads/qrcodes/${fileName}`;
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw new Error(
                `Failed to generate QR code for tracking number: ${trackingNumber}`,
            );
        }
    }
}
