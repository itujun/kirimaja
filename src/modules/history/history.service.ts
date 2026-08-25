import { Injectable, NotFoundException } from '@nestjs/common';
import { Shipment, User } from '@prisma/client';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { UserRole } from 'src/common/enum/user-role.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class HistoryService {
    constructor(private prismaService: PrismaService) {}

    async findAll(user: User): Promise<Shipment[]> {
        if (user.roleId === UserRole.SUPER_ADMIN) {
            return this.prismaService.shipment.findMany({
                where: {
                    paymentStatus: PaymentStatus.PAID,
                },
                include: {
                    shipmentDetail: {
                        include: {
                            user: true,
                            address: true,
                        },
                    },
                    shipmentHistories: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }

        return this.prismaService.shipment.findMany({
            where: {
                paymentStatus: PaymentStatus.PAID,
                shipmentHistories: {
                    some: {
                        userId: user.id,
                    },
                },
            },
            include: {
                shipmentDetail: {
                    include: {
                        user: true,
                        address: true,
                    },
                },
                shipmentHistories: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: number): Promise<Shipment> {
        const shipment = await this.prismaService.shipment.findUnique({
            where: {
                id,
            },
            include: {
                shipmentDetail: {
                    include: {
                        user: true,
                        address: true,
                    },
                },
                shipmentHistories: true,
                payment: true,
            },
        });

        if (!shipment) {
            throw new NotFoundException('Shipment not found');
        }

        return shipment;
    }
}
