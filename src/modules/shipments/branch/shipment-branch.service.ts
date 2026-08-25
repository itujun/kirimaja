import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentBranchLog, User } from '@prisma/client';
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
}
