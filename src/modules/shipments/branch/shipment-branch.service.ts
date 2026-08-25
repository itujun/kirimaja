import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Shipment, ShipmentBranchLog } from '@prisma/client';
import { ShipmentStatus } from 'src/common/enum/shipment-status.enum';
import { UserRole } from 'src/common/enum/user-role.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ScanShipmentDto } from '../dto/scan-shipment.dto';
import { AuthenticatedUser } from 'src/modules/auth/strategies/jwt.strategy';

@Injectable()
export class ShipmentBranchService {
    constructor(private prismaService: PrismaService) {}

    // FIX: sebelumnya method ini menerima Prisma `User` (field `roleId`),
    // tapi controller sebenarnya cuma punya `AuthenticatedUser` (bentuk
    // dari @CurrentUser(), field-nya `role.id` bukan `roleId`). Disamakan
    // dengan pola yang sudah dipakai di shipments.controller.ts
    // (canViewAllShipments -> user.role.id === UserRole.SUPER_ADMIN).
    async findAll(user: AuthenticatedUser): Promise<ShipmentBranchLog[]> {
        if (user.role.id === UserRole.SUPER_ADMIN) {
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

    async scanShipment(
        scanData: ScanShipmentDto,
        userId: number,
    ): Promise<ShipmentBranchLog> {
        const userBranch = await this.prismaService.employeeBranch.findFirst({
            where: {
                userId,
            },
            include: {
                branch: true,
            },
        });

        if (!userBranch) {
            throw new NotFoundException(
                `User with ID ${userId} does not have a branch`,
            );
        }

        const shipment = await this.prismaService.shipment.findUnique({
            where: {
                trackingNumber: scanData.tracking_number,
            },
            include: {
                shipmentDetail: true,
                shipmentHistories: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
        });

        if (!shipment) {
            throw new NotFoundException(
                `Shipment with tracking number ${scanData.tracking_number} not found`,
            );
        }

        await this.validateScanType(
            shipment,
            scanData.type,
            userBranch.branchId,
            scanData.is_ready_to_pickup,
        );

        const newStatus = this.determineNewStatus(
            scanData.type,
            scanData.is_ready_to_pickup,
        );

        return this.prismaService.$transaction(async (tx) => {
            const branchLog = await tx.shipmentBranchLog.create({
                data: {
                    shipmentId: shipment.id,
                    branchId: userBranch.branchId,
                    type: scanData.type,
                    description: this.getDefaultDescription(
                        scanData.type,
                        userBranch.branch.name,
                    ),
                    status: newStatus,
                    scannedByUserId: userId,
                    trackingNumber: shipment.trackingNumber!,
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
            });

            await tx.shipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    deliveryStatus: newStatus,
                },
            });

            await tx.shipmentHistory.create({
                data: {
                    shipmentId: shipment.id,
                    status: newStatus,
                    description: this.getDefaultDescription(
                        scanData.type,
                        userBranch.branch.name,
                    ),
                    userId: userId,
                    branchId: userBranch.branchId,
                },
            });

            return branchLog;
        });
    }

    // Mengambil log scan PALING BARU untuk 1 shipment, lintas cabang
    // manapun -- ini "sumber kebenaran" posisi custody paket saat ini.
    // Dipakai untuk mendukung alur multi-hop (paket transit lewat lebih
    // dari 1 cabang) secara benar, bukan cuma validasi per-cabang yang
    // terisolasi seperti sebelumnya.
    private async getLatestBranchLog(
        shipmentId: number,
    ): Promise<ShipmentBranchLog | null> {
        return this.prismaService.shipmentBranchLog.findFirst({
            where: { shipmentId },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async validateScanType(
        shipment: Shipment,
        scanType: 'IN' | 'OUT',
        branchId: number,
        isReadyToPickup: boolean,
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

        // is_ready_to_pickup cuma masuk akal untuk scan IN -- artinya
        // "cabang ini adalah tujuan akhir, paket siap diambil kurir
        // last-mile". Scan OUT berarti paket sedang MENINGGALKAN cabang,
        // jadi tidak masuk akal kalau di saat bersamaan ditandai "siap
        // diambil di cabang ini".
        if (scanType === 'OUT' && isReadyToPickup) {
            throw new BadRequestException(
                'is_ready_to_pickup is only applicable for scan type IN',
            );
        }

        const latestLog = await this.getLatestBranchLog(shipment.id);

        if (scanType === 'IN') {
            // Mendukung multi-hop: paket BOLEH discan IN di cabang manapun
            // (bukan cuma 1 cabang tetap), tapi TIDAK BOLEH kalau log
            // terakhirnya adalah IN yang belum di-OUT-kan -- itu berarti
            // paket masih tercatat "di dalam" cabang lain, tidak mungkin
            // sekaligus "tiba" di cabang ini.
            if (latestLog && latestLog.type === 'IN') {
                throw new BadRequestException(
                    `Shipment is still recorded as inside branch ID ${latestLog.branchId}. ` +
                        `It must be scanned OUT from that branch before it can be scanned IN elsewhere.`,
                );
            }
        } else {
            // scanType === 'OUT'
            if (!latestLog || latestLog.type !== 'IN') {
                throw new BadRequestException(
                    'No matching IN scan found for this shipment to depart from.',
                );
            }

            // FIX: sebelumnya validasi cuma cek "PERNAH ada scan IN di
            // cabang ini kapanpun" (findFirst tanpa constraint urutan),
            // bukan "shipment SAAT INI ada di cabang ini". Akibatnya kalau
            // shipment sempat IN lalu OUT dari cabang yang sama sebelumnya,
            // scan OUT kedua tetap lolos secara keliru. Sekarang dicek
            // terhadap log PALING BARU saja.
            if (latestLog.branchId !== branchId) {
                throw new BadRequestException(
                    `Shipment was last scanned IN at branch ID ${latestLog.branchId}, not at this branch. ` +
                        `It can only be scanned OUT from the branch it currently resides in.`,
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
