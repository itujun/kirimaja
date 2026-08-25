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

    async pickShipment(
        trackingNumber: string,
        userId: number,
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
                    status: ShipmentStatus.PICKED_UP,
                    description: `Shipment with tracking number ${trackingNumber} is waiting for pickup by user with ID ${userId}`,
                },
            });

            await tx.shipmentDetail.update({
                where: {
                    id: updatedShipment.id,
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
                    status: ShipmentStatus.IN_TRANSIT,
                    description: `Shipment with tracking number ${trackingNumber} is waiting for pickup by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    async pickShipmentFromBranch(
        trackingNumber: string,
        userId: number,
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
                    status: ShipmentStatus.READY_TO_DELIVER,
                    description: `Shipment with tracking number ${trackingNumber} is pick from branch by user with ID ${userId}`,
                },
            });

            return updatedShipment;
        });
    }

    async pickupShipmentFromBranch(
        trackingNumber: string,
        userId: number,
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
                    status: ShipmentStatus.ON_THE_WAY_TO_ADDRESS,
                    description: `Shipment with tracking number ${trackingNumber} is pickup from branch by user with ID ${userId}`,
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
                    status: ShipmentStatus.DELIVERED,
                    description: `Shipment with tracking number ${trackingNumber} is delivered to customer by user with ID ${userId}`,
                },
            });

            await tx.shipmentDetail.update({
                where: {
                    id: updatedShipment.id,
                },
                data: {
                    receiptProof: photoSaved,
                },
            });

            return updatedShipment;
        });
    }
}
