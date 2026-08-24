import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QueueService } from '../queue.service';

export interface PaymentExpiryJobData {
    paymentId: number;
    shipmentId: number;
    externalId: string;
}

@Processor('payment-expired-queue')
@Injectable()
export class PaymentExpiredQueueProcessor {
    private readonly logger = new Logger(PaymentExpiredQueueProcessor.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly queueService: QueueService,
    ) {}

    @Process('payment-expired-job')
    async handleExpiryPayment(job: Job<PaymentExpiryJobData>) {
        const { data } = job;
        this.logger.log(
            `Processing payment expiry job for payment ID: ${data.paymentId}`,
        );

        try {
            const payment = await this.prismaService.payment.findUnique({
                where: { id: data.paymentId },
                include: {
                    shipment: {
                        include: {
                            shipmentDetail: {
                                include: {
                                    user: {
                                        select: {
                                            email: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!payment) {
                this.logger.warn(`Payment with ID ${data.paymentId} not found`);
                return;
            }

            // Guard ini juga yang menyebabkan job ini SKIP total kalau
            // webhook Xendit sudah lebih dulu mengubah status (race
            // condition yang dijelaskan sebelumnya) -- makanya jalur
            // webhook di ShipmentsService sekarang juga punya logic yang
            // setara, supaya expiry tetap tertangani siapa pun yang
            // menang duluan.
            if (payment.status !== PaymentStatus.PENDING) {
                this.logger.log(
                    `Payment with ID ${data.paymentId} is no longer pending(status: ${payment.status}), skipping expiry`,
                );
                return;
            }

            await this.prismaService.$transaction(async (tx) => {
                await tx.payment.update({
                    where: { id: data.paymentId },
                    data: { status: PaymentStatus.EXPIRED },
                });

                await tx.shipment.update({
                    where: { id: data.shipmentId },
                    data: { paymentStatus: PaymentStatus.EXPIRED },
                });

                await tx.shipmentHistory.create({
                    data: {
                        shipmentId: data.shipmentId,
                        status: PaymentStatus.EXPIRED,
                        description: 'Payment expired - automatic expiry',
                    },
                });
            });

            this.logger.log(
                `Payment with ID ${data.paymentId} has been expired successfully`,
            );

            // Sebelumnya di sini ada catatan bahwa email akan dikirim oleh
            // webhook processor saat Xendit mengirim webhook EXPIRED --
            // ternyata asumsi itu salah, handlePaymentWebhook() dulu tidak
            // pernah mengirim email untuk status selain PAID/SETTLED.
            // Try-catch terpisah dari transaksi di atas -- kegagalan kirim
            // email TIDAK BOLEH membuat seluruh job dianggap gagal dan
            // di-retry BullMQ (retry akan mengulang proses yang sebenarnya
            // sudah sukses di atas).
            try {
                const userEmail = payment.shipment.shipmentDetail?.user.email;
                if (userEmail) {
                    await this.queueService.addEmailJob({
                        type: 'payment-expired',
                        to: userEmail,
                        shipmentId: data.shipmentId,
                        amount: payment.shipment.price || 0,
                    });
                }
            } catch (error) {
                this.logger.error(
                    `Failed to queue payment expired email for payment ID: ${data.paymentId}`,
                    error,
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed processing payment expiry job for payment ID: ${data.paymentId}`,
                error.stack,
            );
            throw error;
        }
    }
}
