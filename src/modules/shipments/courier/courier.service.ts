import { Injectable, NotFoundException } from '@nestjs/common';
import { Shipment } from '@prisma/client';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { ShipmentStatus } from 'src/common/enum/shipment-status.enum';
import { SHIPMENT_WITH_RELATIONS_INCLUDE } from 'src/common/prisma/prisma-includes';
import { PrismaService } from 'src/common/prisma/prisma.service';

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
}
