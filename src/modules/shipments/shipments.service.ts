import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { CreateShipmentDto, DeliveryType } from './dto/create-shipment.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QueueService } from 'src/common/queue/queue.service';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { XenditService } from 'src/common/xendit/xendit.service';
import { Shipment } from '@prisma/client';
import { getDistance } from 'geolib';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.schema';
import { QrCodeService } from 'src/common/qrcode/qrcode.service';
import { XenditWebhookDto } from './dto/xendit-webhook.dto';
import { ShipmentStatus } from 'src/common/enum/shipment-status.enum';
import { PdfService, ShipmentPdfData } from 'src/common/pdf/pdf.service';
import {
    SHIPMENT_WITH_RELATIONS_INCLUDE,
    ShipmentWithRelations,
} from 'src/common/prisma/prisma-includes';

// Bentuk response khusus untuk fitur tracking publik -- sengaja BUKAN
// tipe Shipment penuh. Endpoint ini terbuka untuk siapa saja yang login
// dan tahu nomor resinya (mirip JNE/J&T), jadi cuma boleh berisi info
// status & histori perjalanan, TIDAK boleh ada email/no HP pengirim
// ataupun detail pembayaran (invoiceId, invoiceUrl, dst).
export interface ShipmentTrackingView {
    trackingNumber: string;
    deliveryStatus: string;
    paymentStatus: string;
    packageType: string;
    deliveryType: string;
    createdAt: Date;
    history: {
        status: string;
        description: string;
        createdAt: Date;
    }[];
}

@Injectable()
export class ShipmentsService {
    constructor(
        private prismaService: PrismaService,
        private queueService: QueueService,
        private openCageService: OpenCageService,
        private xenditService: XenditService,
        private readonly configService: ConfigService<Env, true>,
        private qrcodeService: QrCodeService,
        private pdfService: PdfService,
    ) {}

    async create(
        createShipmentDto: CreateShipmentDto,
        userId: number,
    ): Promise<Shipment> {
        // 1) Validasi pickup address DULUAN (query DB lokal, murah) --
        //    sebelum panggil OpenCage (API eksternal berbayar & rate
        //    limited). Urutan lama memanggil geocode() lebih dulu berarti
        //    setiap request dengan pickup_address_id yang salah tetap
        //    membakar 1 API call ke OpenCage secara sia-sia.
        //
        // 2) `userId` WAJIB ikut jadi filter. Sebelumnya endpoint ini
        //    rentan IDOR -- user A bisa create shipment memakai
        //    pickup_address_id milik user B asal ID-nya diketahui/ditebak,
        //    dan shipment yang terbentuk jadi "milik" user B (via
        //    userAddress.userId), bukan user A yang benar-benar request.
        const userAddress = await this.prismaService.userAddress.findFirst({
            where: {
                id: createShipmentDto.pickup_address_id,
                userId,
            },
            include: {
                user: true,
            },
        });

        if (
            !userAddress ||
            userAddress.latitude === null ||
            userAddress.longitude === null
        ) {
            // Eksplisit cek `=== null`, BUKAN falsy check
            // (`!userAddress.latitude`). Falsy check salah menganggap
            // latitude = 0 sebagai "tidak ada", padahal 0 derajat lintang
            // itu valid (garis khatulistiwa -- relevan untuk app
            // Indonesia, mis. Pontianak nyaris tepat di 0°).
            throw new NotFoundException('Pickup address not found');
        }

        const { lat, lng } = await this.openCageService.geocode(
            createShipmentDto.destination_address,
        );

        const distance = getDistance(
            {
                latitude: userAddress.latitude,
                longitude: userAddress.longitude,
            },
            { latitude: lat, longitude: lng },
        );

        const distanceInKm = distance / 1000; // Convert meters to kilometers

        const shipmentCost = this.calculateShipmentCost(
            distanceInKm,
            createShipmentDto.weight,
            createShipmentDto.delivery_type,
        );

        const shipment = await this.prismaService.$transaction(async (tx) => {
            const newShipment = await tx.shipment.create({
                data: {
                    paymentStatus: PaymentStatus.PENDING,
                    distance: distanceInKm,
                    price: shipmentCost.totalPrice,
                },
            });

            await tx.shipmentDetail.create({
                data: {
                    shipmentId: newShipment.id,
                    pickupAddressId: createShipmentDto.pickup_address_id,
                    destinationAddress: createShipmentDto.destination_address,
                    recipientName: createShipmentDto.recipient_name,
                    recipientPhone: createShipmentDto.recipient_phone,
                    weight: createShipmentDto.weight,
                    packageType: createShipmentDto.package_type,
                    deliveryType: createShipmentDto.delivery_type,
                    destinationLatitude: lat,
                    destinationLongitude: lng,
                    basePrice: shipmentCost.basePrice,
                    weightPrice: shipmentCost.weightPrice,
                    distancePrice: shipmentCost.distancePrice,
                    userId: userAddress.userId,
                },
            });

            return newShipment;
        });

        let invoice;
        try {
            invoice = await this.xenditService.createInvoice({
                externalId: `INV-${Date.now()}-${shipment.id}`,
                amount: shipmentCost.totalPrice,
                payerEmail: userAddress.user.email,
                description: `Shipment #${shipment.id} from ${userAddress.address} to ${createShipmentDto.destination_address}`,
                successRedirectUrl: `${this.configService.get('FRONTEND_URL')}/send-package/detail/${shipment.id}`,
                invoiceDuration: 86400, // 24 hours in seconds
            });
        } catch (error) {
            // Kompensasi: shipment + shipmentDetail SUDAH ter-commit di
            // transaksi sebelumnya. Kalau error di sini dibiarkan lempar
            // begitu saja, shipment itu "nyangkut" permanen -- statusnya
            // PENDING selamanya, tanpa invoice, dan tidak akan pernah
            // di-expire oleh job apa pun (job expiry baru didaftarkan
            // setelah invoice berhasil dibuat, lihat di bawah).
            console.error('Failed to create Xendit invoice: ', error);
            await this.prismaService.shipment.update({
                where: { id: shipment.id },
                data: { paymentStatus: PaymentStatus.FAILED },
            });
            throw new ServiceUnavailableException(
                'Failed to create payment invoice, please try again later',
            );
        }

        const payment = await this.prismaService.$transaction(async (tx) => {
            const createPayment = await tx.payment.create({
                data: {
                    shipmentId: shipment.id,
                    externalId: invoice.externalId,
                    invoiceId: invoice.id!,
                    status: invoice.status,
                    invoiceUrl: invoice.invoiceUrl,
                    expiryDate: invoice.expiryDate,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: shipment.id,
                    status: PaymentStatus.PENDING,
                    description: `Shipment created with total price ${shipmentCost.totalPrice}`,
                },
            });

            return createPayment;
        });

        try {
            await this.queueService.addEmailJob({
                type: 'payment-notification',
                to: userAddress.user.email,
                shipmentId: shipment.id,
                amount: shipmentCost.totalPrice,
                paymentUrl: invoice.invoiceUrl,
                expiryDate: invoice.expiryDate,
            });
        } catch (error) {
            console.error(
                'Failed to add payment notification email job to queue',
                error,
            );
        }

        try {
            await this.queueService.addPaymentExpiryJob(
                {
                    paymentId: payment.id,
                    shipmentId: shipment.id,
                    externalId: invoice.externalId!,
                },
                invoice.expiryDate,
            );
        } catch (error) {
            console.error('Failed to add payment expiry job to queue: ', error);
        }

        return shipment;
    }

    async handlePaymentWebhook(webhookData: XenditWebhookDto): Promise<void> {
        const payment = await this.prismaService.payment.findFirst({
            where: {
                externalId: webhookData.external_id,
            },
            include: {
                shipment: {
                    include: {
                        shipmentDetail: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException(
                `Payment with external ID ${webhookData.external_id} not found`,
            );
        }

        await this.prismaService.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status: webhookData.status,
                    paymentMethod: webhookData.payment_method,
                },
            });

            if (
                webhookData.status === PaymentStatus.PAID ||
                webhookData.status === PaymentStatus.SETTLED
            ) {
                const trackingNumber = `KA${webhookData.id}`;

                let qrcodeImagePath: string | null = null;
                try {
                    qrcodeImagePath =
                        await this.qrcodeService.generateQrCode(trackingNumber);
                } catch (error) {
                    console.error('Failed to generate QR code: ', error);
                    throw new BadRequestException(
                        `Failed to generate QR code for tracking number: ${trackingNumber}`,
                    );
                }

                await tx.shipment.update({
                    where: {
                        id: payment.shipmentId,
                    },
                    data: {
                        trackingNumber,
                        deliveryStatus: ShipmentStatus.READY_TO_PICKUP,
                        paymentStatus: webhookData.status,
                        qrCodeImage: qrcodeImagePath,
                    },
                });

                await tx.shipmentHistory.create({
                    data: {
                        shipmentId: payment.shipmentId,
                        status: ShipmentStatus.READY_TO_PICKUP,
                        description: `Payment ${webhookData.status} for shipment with tracking number ${trackingNumber}`,
                        userId: payment.shipment.shipmentDetail?.userId,
                    },
                });

                try {
                    await this.queueService.cancelPaymentExpiredJob(payment.id);
                } catch (error) {
                    console.error(
                        'Failed to cancel payment expiry job: ',
                        error,
                    );
                }

                try {
                    const userEmail =
                        payment.shipment.shipmentDetail?.user.email;
                    if (userEmail) {
                        await this.queueService.addEmailJob({
                            type: 'payment-success',
                            to: userEmail,
                            shipmentId: payment.shipmentId,
                            amount:
                                payment.shipment.price || webhookData.amount,
                            trackingNumber:
                                payment.shipment.trackingNumber || undefined,
                        });
                    }
                } catch (error) {
                    console.error(
                        'Failed to add payment failed email job to queue: ',
                        error,
                    );
                }
            }
        });
    }

    async findAll(
        userId: number,
        canViewAll: boolean,
    ): Promise<ShipmentWithRelations[]> {
        return await this.prismaService.shipment.findMany({
            where: canViewAll
                ? undefined
                : {
                      shipmentDetail: {
                          userId,
                      },
                  },
            include: SHIPMENT_WITH_RELATIONS_INCLUDE,
            orderBy: {
                createdAt: 'desc',
            },
            take: 20,
            skip: 0,
        });
    }

    async findOne(
        id: number,
        userId: number,
        canViewAll: boolean,
    ): Promise<ShipmentWithRelations> {
        // Syarat kepemilikan sekarang ikut masuk ke WHERE clause (sama seperti
        // findAll), bukan diambil dulu baru difilter di application code.
        // Row yang bukan hak user (dan canViewAll false) tidak akan pernah
        // ditarik ke memori aplikasi sama sekali.
        const shipment = await this.prismaService.shipment.findFirst({
            where: canViewAll
                ? { id }
                : {
                      id,
                      shipmentDetail: {
                          userId,
                      },
                  },
            include: SHIPMENT_WITH_RELATIONS_INCLUDE,
        });

        if (!shipment) {
            // Tetap 404 generik untuk 2 kemungkinan sekaligus (tidak ada /
            // bukan milikmu) -- prinsip cegah enumeration attack masih
            // berlaku sama seperti sebelumnya.
            throw new NotFoundException(`Shipment with ID ${id} not found`);
        }

        return shipment;
    }

    private calculateShipmentCost(
        distance: number,
        weight: number,
        deliveryType: DeliveryType,
    ): {
        totalPrice: number;
        basePrice: number;
        weightPrice: number;
        distancePrice: number;
    } {
        // Nilai di bawah ini dalam Rupiah utuh, BUKAN "cents" seperti yang
        // tertulis di komentar lama pada shipmentHistory.description --
        // sudah dirapikan di atas supaya tidak menyesatkan pembaca
        // berikutnya (mis. ada yang mengira harus dibagi 100).
        const baseRates: Record<DeliveryType, number> = {
            same_day: 15000,
            next_day: 10000,
            regular: 5000,
        };

        const weightRates: Record<DeliveryType, number> = {
            same_day: 1000,
            next_day: 800,
            regular: 500,
        };

        const distanceTierRates: Record<
            DeliveryType,
            { tier1: number; tier2: number; tier3: number }
        > = {
            same_day: {
                tier1: 8000, // 0-50 km
                tier2: 12000, // 50-100 km
                tier3: 15000, // 100+ km (per 100km block)
            },
            next_day: {
                tier1: 6000,
                tier2: 9000,
                tier3: 12000,
            },
            regular: {
                tier1: 4000,
                tier2: 6000,
                tier3: 8000,
            },
        };

        // Tidak perlu fallback `|| baseRates.regular` lagi -- deliveryType
        // sudah dijamin salah satu dari 3 nilai valid oleh Zod enum di DTO.
        const basePrice = baseRates[deliveryType];
        const weightRate = weightRates[deliveryType];
        const distanceRate = distanceTierRates[deliveryType];

        const weightKg = Math.ceil(weight / 1000); // Convert grams to kg
        const weightPrice = weightKg * weightRate;

        let distancePrice = 0;

        if (distance <= 50) {
            distancePrice = distanceRate.tier1;
        } else if (distance <= 100) {
            distancePrice = distanceRate.tier1 + distanceRate.tier2;
        } else {
            const extraDistance = Math.ceil((distance - 100) / 100);
            distancePrice =
                distanceRate.tier3 + extraDistance * distanceRate.tier3;
        }

        const totalPrice = basePrice + weightPrice + distancePrice;

        const minimumPrice = 10000;

        const finalPrice = Math.max(totalPrice, minimumPrice);

        return {
            totalPrice: finalPrice,
            basePrice,
            weightPrice,
            distancePrice,
        };
    }

    async generateShipmentPdf(
        shipmentId: number,
        userId: number,
        canViewAll: boolean,
    ): Promise<Buffer> {
        const shipment = await this.prismaService.shipment.findFirst({
            where: canViewAll
                ? { id: shipmentId }
                : {
                      id: shipmentId,
                      shipmentDetail: {
                          userId,
                      },
                  },
            include: {
                shipmentDetail: {
                    include: {
                        user: true,
                        address: true,
                    },
                },
                payment: true,
            },
        });

        if (!shipment) {
            throw new NotFoundException(
                `Shipment with ID ${shipmentId} not found`,
            );
        }

        const shipmentDetail = shipment.shipmentDetail;
        if (!shipmentDetail) {
            throw new NotFoundException(
                `Shipment detail for shipment with ID ${shipmentId} not found`,
            );
        }

        // Label pengiriman baru bermakna setelah shipment dibayar dan dapat
        // nomor resi. Sebelum itu, PDF yang dihasilkan akan berisi QR code
        // untuk teks "N/A" -- bukan cuma tidak berguna, tapi berbahaya kalau
        // sampai tercetak fisik dan dianggap label yang sah.
        if (!shipment.trackingNumber) {
            throw new BadRequestException(
                'Label pengiriman belum bisa dicetak karena pembayaran belum selesai',
            );
        }

        const pdfData: ShipmentPdfData = {
            trackingNumber: shipment.trackingNumber,
            shipmentId: shipment.id,
            createdAt: shipment.createdAt,
            deliveryType: shipmentDetail.deliveryType,
            packageType: shipmentDetail.packageType,
            weight: shipmentDetail.weight || 0,
            price: shipment.price || 0,
            distance: shipment.distance || 0,
            paymentStatus: shipment.paymentStatus || 'N/A',
            deliveryStatus: shipment.deliveryStatus || 'N/A',
            basePrice: shipmentDetail.basePrice || 0,
            weightPrice: shipmentDetail.weightPrice || 0,
            distancePrice: shipmentDetail.distancePrice || 0,
            senderName: shipmentDetail.user.name || 'N/A',
            senderEmail: shipmentDetail.user.email || 'N/A',
            senderPhone: shipmentDetail.user.phoneNumber || 'N/A',
            // Fallback dicek SEBELUM di-convert ke string, bukan sesudah --
            // `${undefined}` di JS jadi string "undefined" yang truthy, jadi
            // `|| 'N/A'` versi lama tidak pernah kepakai kalau address null.
            pickupAddress: shipmentDetail.address?.address ?? 'N/A',
            recipientName: shipmentDetail.recipientName || 'N/A',
            recipientPhone: shipmentDetail.recipientPhone || 'N/A',
            deliveryAddress: shipmentDetail.destinationAddress ?? 'N/A',
            qrCodePath:
                shipment.qrCodeImage ||
                (await this.qrcodeService.generateQrCode(
                    shipment.trackingNumber,
                )),
        };

        return this.pdfService.generateShipmentPdf(pdfData);
    }

    async findShipmentByTrackingNumber(
        trackingNumber: string,
    ): Promise<ShipmentTrackingView> {
        const shipment = await this.prismaService.shipment.findFirst({
            where: {
                trackingNumber,
            },
            select: {
                trackingNumber: true,
                deliveryStatus: true,
                paymentStatus: true,
                createdAt: true,
                shipmentDetail: {
                    select: {
                        packageType: true,
                        deliveryType: true,
                        // Sengaja TIDAK select user/address/recipientPhone di
                        // sini -- itu yang menyebabkan email & data pribadi
                        // pengirim ikut bocor ke siapa pun yang tahu nomor
                        // resi di versi sebelumnya.
                    },
                },
                shipmentHistories: {
                    select: {
                        status: true,
                        description: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                // payment TIDAK di-select sama sekali -- sesuai keputusan
                // kamu, detail pembayaran bukan bagian dari fitur tracking.
            },
        });

        if (!shipment) {
            throw new NotFoundException(
                `Shipment with tracking number ${trackingNumber} not found`,
            );
        }

        return {
            trackingNumber: shipment.trackingNumber ?? trackingNumber,
            deliveryStatus: shipment.deliveryStatus || 'N/A',
            paymentStatus: shipment.paymentStatus || 'N/A',
            packageType: shipment.shipmentDetail?.packageType || 'N/A',
            deliveryType: shipment.shipmentDetail?.deliveryType || 'N/A',
            createdAt: shipment.createdAt,
            history: shipment.shipmentHistories.map((h) => ({
                status: h.status,
                description: h.description!,
                createdAt: h.createdAt,
            })),
        };
    }
}
