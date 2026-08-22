import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { QueueModule } from 'src/common/queue/queue.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { XenditService } from 'src/common/xendit/xendit.service';

@Module({
    imports: [QueueModule, PrismaModule],
    controllers: [ShipmentsController],
    providers: [ShipmentsService, OpenCageService, XenditService],
})
export class ShipmentsModule {}
