import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { QueueService } from './queue.service';
import { EmailQueueProcessor } from './processors/email-queue.processor';
import { PaymentExpiredQueueProcessor } from './processors/payment-expired-queue.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD || undefined,
            },
        }),
        BullModule.registerQueue(
            {
                name: 'email-queue',
            },
            {
                name: 'payment-expired-queue',
            },
        ),
        PrismaModule,
    ],
    controllers: [],
    providers: [
        QueueService,
        EmailService,
        EmailQueueProcessor,
        PaymentExpiredQueueProcessor,
    ],
    exports: [QueueService],
})
export class QueueModule {}
