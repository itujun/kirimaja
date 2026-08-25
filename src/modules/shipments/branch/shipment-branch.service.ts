import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Shipment, ShipmentBranchLog, User } from '@prisma/client';
import { ShipmentStatus } from 'src/common/enum/shipment-status.enum';
import { UserRole } from 'src/common/enum/user-role.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ShipmentBranchService {
    constructor(private prismaService: PrismaService) {}

    async findAll(user: User): Promise<ShipmentBranchLog[]> {
        if (user.roleId === UserRole.SUPER_ADMIN) {
            return this.prismaService.shipmentBranchLog.findMany({
                include: {
                    shipment: {
                        include: {
                            shipmentDetail: true,
                        },
                    },
                    branch: true,
                    scannedByUser: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }

        const userBranch = await this.prismaService.employeeBranch.findFirst({
            where: {
                userId: user.id,
            },
            include: {
                branch: true,
            },
        });

        if (!userBranch) {
            throw new NotFoundException(
                `User with ID ${user.id} does not have a branch`,
            );
        }

        return this.prismaService.shipmentBranchLog.findMany({
            where: {
                branchId: userBranch.branchId,
            },
            include: {
                shipment: {
                    include: {
                        shipmentDetail: true,
                    },
                },
                branch: true,
                scannedByUser: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    private async validateScanType(
        shipment: Shipment,
        scanType: 'IN' | 'OUT',
        branchId: number,
    ): Promise<void> {
        const validStatuses = [
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.ARRIVED_AT_BRANCH,
            ShipmentStatus.AT_BRANCH,
            ShipmentStatus.DEPARTED_FROM_BRANCH,
        ];

        if (
            !validStatuses.includes(shipment.deliveryStatus as ShipmentStatus)
        ) {
            throw new BadRequestException(
                `Shipment must be one of ${validStatuses.join(', ')}`,
            );
        }

        if (scanType === 'OUT') {
            const lastInScan =
                await this.prismaService.shipmentBranchLog.findFirst({
                    where: {
                        shipmentId: shipment.id,
                        branchId,
                        scanType: 'IN',
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });

            if (!lastInScan) {
                throw new BadRequestException(
                    'No IN scan found for this shipment at this branch',
                );
            }
        }
    }

    private determineNewStatus(
        scanType: 'IN' | 'OUT',
        isReadyToPickup: boolean,
    ): ShipmentStatus {
        if (scanType === 'IN' && !isReadyToPickup) {
            return ShipmentStatus.ARRIVED_AT_BRANCH;
        } else if (scanType === 'OUT' && !isReadyToPickup) {
            return ShipmentStatus.DEPARTED_FROM_BRANCH;
        } else {
            return ShipmentStatus.READY_TO_PICKUP_AT_BRANCH;
        }
    }

    private getDefaultDescription(
        scanType: 'IN' | 'OUT',
        branchName: string,
    ): string {
        return scanType === 'IN'
            ? `Shipment arrived at ${branchName}`
            : `Shipment departed from ${branchName}`;
    }
}
