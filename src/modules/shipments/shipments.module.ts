import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { QueueModule } from 'src/common/queue/queue.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { ShipmentWebhookController } from './webhook/shipment-webhook.controller';
import { QrCodeService } from 'src/common/qrcode/qrcode.service';
import { PdfService } from 'src/common/pdf/pdf.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { XenditWebhookGuard } from './webhook/xendit-webhook.guard';

@Module({
    // PermissionsModule wajib di-import karena PermissionGuard (sekarang
    // dipasang di ShipmentsController) meng-inject PermissionsService.
    // Tanpa ini Nest akan gagal start dengan error "Nest can't resolve
    // dependencies of PermissionGuard" -- pola yang sama seperti catatan
    // sebelumnya soal PermissionsService.
    imports: [QueueModule, PrismaModule, PermissionsModule],
    controllers: [ShipmentsController, ShipmentWebhookController],
    providers: [
        ShipmentsService,
        OpenCageService,
        XenditService,
        QrCodeService,
        PdfService,
        XenditWebhookGuard,
    ],
})
export class ShipmentsModule {}
