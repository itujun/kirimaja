import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { QueueModule } from 'src/common/queue/queue.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { ShipmentWebhookController } from './webhook/shipment-webhook.controller';
import { QrCodeService } from 'src/common/qrcode/qrcode.service';

@Module({
    imports: [QueueModule, PrismaModule],
    controllers: [ShipmentsController, ShipmentWebhookController],
    providers: [
        ShipmentsService,
        OpenCageService,
        XenditService,
        QrCodeService,
    ],
})
export class ShipmentsModule {}
