import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Shipment } from '@prisma/client';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { ShipmentStatus } from 'src/common/enum/shipment-status.enum';
import { SHIPMENT_WITH_RELATIONS_INCLUDE } from 'src/common/prisma/prisma-includes';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { assertValidCourierPhotoBuffer } from './utils/courier-photo-file-validator';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { COURIER_PHOTO_UPLOAD_DIR } from './constants/courier-photo.constant';

@Injectable()
export class ShipmentCourierService {
    constructor(private prismaService: PrismaService) {}

    async findAll(): Promise<Shipment[]> {
        return await this.prismaService.shipment.findMany({
            where: {
                paymentStatus: PaymentStatus.PAID,
                deliveryStatus: {
                    in: [
                        ShipmentStatus.READY_TO_PICKUP,
                        ShipmentStatus.WAITING_PICKUP,
                        ShipmentStatus.PICKED_UP,
                        ShipmentStatus.READY_TO_PICKUP_AT_BRANCH,
                        ShipmentStatus.READY_TO_DELIVER,
                        ShipmentStatus.ON_THE_WAY_TO_ADDRESS,
                        ShipmentStatus.ON_THE_WAY,
                        ShipmentStatus.DELIVERED,
                    ],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Single source of truth untuk alur status kurir: setiap aksi HANYA
    // boleh dijalankan kalau shipment sedang berada di salah satu status
    // "predecessor" yang valid. Ini mencegah aksi dipanggil di luar urutan
    // (mis. deliverToCustomer dipanggil padahal belum pernah pickUpShipment)
    // atau dipanggil berulang kali (retry/double-tap) pada status yang sama.
    //
    // Khusus untuk pickShipment: predecessor-nya (READY_TO_PICKUP) HANYA
    // pernah di-set oleh webhook Xendit bersamaan dengan paymentStatus jadi
    // PAID/SETTLED (lihat shipments.service.ts). Jadi guard status ini
    // otomatis juga menjamin shipment sudah lunas -- tidak perlu cek
    // paymentStatus terpisah di sini.
    private assertValidStatusTransition(
        shipment: Shipment,
        allowedCurrentStatuses: ShipmentStatus[],
    ): void {
        const currentStatus = shipment.deliveryStatus as ShipmentStatus | null;

        if (!currentStatus || !allowedCurrentStatuses.includes(currentStatus)) {
            throw new BadRequestException(
                `Shipment with tracking number ${shipment.trackingNumber} has status ` +
                    `"${currentStatus ?? 'NONE'}", but expected one of: ${allowedCurrentStatuses.join(', ')}`,
            );
        }
    }

    private async getUserBranchOrThrow(userId: number): Promise<{
        branchId: number;
    }> {
        const userBranch = await this.prismaService.employeeBranch.findFirst({
            where: {
                userId,
            },
            select: {
                branchId: true,
            },
        });

        if (!userBranch) {
            throw new NotFoundException(
                `User with ID ${userId} does not have a branch`,
            );
        }

        return userBranch;
    }

    private async getShipmentByTrackingNumberOrThrow(
        trackingNumber: string,
    ): Promise<Shipment> {
        const shipment = await this.prismaService.shipment.findUnique({
            where: {
                trackingNumber,
            },
            include: SHIPMENT_WITH_RELATIONS_INCLUDE,
        });

        if (!shipment) {
            throw new NotFoundException(
                `Shipment with tracking number ${trackingNumber} not found`,
            );
        }

        return shipment;
    }

    async pickShipment(
        trackingNumber: string,
        userId: number,
    ): Promise<Shipment> {
        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [
            ShipmentStatus.READY_TO_PICKUP,
        ]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.WAITING_PICKUP,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.WAITING_PICKUP,
                    description: `Shipment with tracking number ${trackingNumber} is waiting for pickup by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    private async savePhotoFile(file: Express.Multer.File): Promise<string> {
        const detected = await assertValidCourierPhotoBuffer(file.buffer);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}.${detected.ext}`;

        await mkdir(COURIER_PHOTO_UPLOAD_DIR, { recursive: true });
        await writeFile(join(COURIER_PHOTO_UPLOAD_DIR, filename), file.buffer);

        return filename;
    }

    async pickUpShipment(
        trackingNumber: string,
        userId: number,
        photo: Express.Multer.File,
    ): Promise<Shipment> {
        if (!photo) {
            throw new BadRequestException(`Photo is required`);
        }

        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [
            ShipmentStatus.WAITING_PICKUP,
        ]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        // File ditulis ke disk SEBELUM transaction DB dimulai -- ini
        // sengaja, supaya proses I/O (yang relatif lambat) tidak ikut
        // menahan lock transaction. Trade-off-nya: kalau transaction di
        // bawah gagal, file ini jadi orphan (tidak tercatat di DB manapun).
        // Untuk sekarang trade-off ini kita terima (sama seperti pola foto
        // lain di project ini); pembersihan orphan file didaftarkan sebagai
        // technical debt terpisah, bukan bagian dari sesi ini.
        const photoSaved = await this.savePhotoFile(photo);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.PICKED_UP,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.PICKED_UP,
                    description: `Shipment with tracking number ${trackingNumber} has been picked up by user with ID ${userId}`,
                },
            });

            // FIX: sebelumnya `where: { id: updatedShipment.id }` -- itu
            // salah, karena `id` di sini adalah PRIMARY KEY tabel
            // shipment_details, BUKAN foreign key ke shipments. Nilainya
            // kebetulan sama hari ini karena ShipmentDetail selalu dibuat
            // 1:1 tepat setelah Shipment (lihat shipments.service.ts), tapi
            // itu bukan jaminan struktural. `shipmentId` sudah ditandai
            // @unique di schema justru untuk lookup seperti ini.
            await tx.shipmentDetail.update({
                where: {
                    shipmentId: updatedShipment.id,
                },
                data: {
                    pickupProof: photoSaved,
                },
            });

            return updatedShipment;
        });
    }

    async deliverShipmentToBranch(
        trackingNumber: string,
        userId: number,
    ): Promise<Shipment> {
        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [ShipmentStatus.PICKED_UP]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.IN_TRANSIT,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.IN_TRANSIT,
                    description: `Shipment with tracking number ${trackingNumber} is being delivered to branch by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    async pickShipmentFromBranch(
        trackingNumber: string,
        userId: number,
    ): Promise<Shipment> {
        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [
            ShipmentStatus.READY_TO_PICKUP_AT_BRANCH,
        ]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.READY_TO_DELIVER,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.READY_TO_DELIVER,
                    description: `Shipment with tracking number ${trackingNumber} has been picked up from branch by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    async pickupShipmentFromBranch(
        trackingNumber: string,
        userId: number,
    ): Promise<Shipment> {
        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [
            ShipmentStatus.READY_TO_DELIVER,
        ]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.ON_THE_WAY_TO_ADDRESS,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.ON_THE_WAY_TO_ADDRESS,
                    description: `Shipment with tracking number ${trackingNumber} is on the way to customer address by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    async deliverToCustomer(
        trackingNumber: string,
        userId: number,
        photo: Express.Multer.File,
    ): Promise<Shipment> {
        if (!photo) {
            throw new BadRequestException(`Photo is required`);
        }

        const shipment =
            await this.getShipmentByTrackingNumberOrThrow(trackingNumber);

        this.assertValidStatusTransition(shipment, [
            ShipmentStatus.ON_THE_WAY_TO_ADDRESS,
        ]);

        const userBranch = await this.getUserBranchOrThrow(userId);

        const photoSaved = await this.savePhotoFile(photo);

        return await this.prismaService.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: ShipmentStatus.DELIVERED,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: updatedShipment.id,
                    userId,
                    branchId: userBranch.branchId,
                    status: ShipmentStatus.DELIVERED,
                    description: `Shipment with tracking number ${trackingNumber} is delivered to customer by user with ID ${userId}`,
                },
            });

            // FIX: sama seperti di pickUpShipment -- pakai `shipmentId`,
            // bukan `id`, supaya mencari berdasarkan foreign key yang
            // benar, bukan kebetulan kesamaan angka PK.
            await tx.shipmentDetail.update({
                where: {
                    shipmentId: updatedShipment.id,
                },
                data: {
                    receiptProof: photoSaved,
                },
            });

            return updatedShipment;
        });
    }
}
