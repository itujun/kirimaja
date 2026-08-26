import { Injectable, NotFoundException } from '@nestjs/common';
import { Shipment } from '@prisma/client';
import { PaymentStatus } from 'src/common/enum/payment-status.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class HistoryService {
    constructor(private prismaService: PrismaService) {}

    // FIX: sebelumnya filter non-super-admin memakai
    // `shipmentHistories: { some: { userId } }` -- itu salah field.
    // ShipmentHistory.userId adalah AKTOR yang melakukan aksi (kurir/staff
    // cabang yang scan atau antar), bukan PEMILIK shipment. Customer tidak
    // pernah muncul di sana, jadi hasilnya selalu kosong untuk role
    // customer -- padahal customer adalah pengguna utama endpoint ini.
    // Kepemilikan yang benar ada di ShipmentDetail.userId.
    async findAll(userId: number, canViewAll: boolean): Promise<Shipment[]> {
        return this.prismaService.shipment.findMany({
            where: canViewAll
                ? { paymentStatus: PaymentStatus.PAID }
                : {
                      paymentStatus: PaymentStatus.PAID,
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
                shipmentHistories: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // FIX: sebelumnya method ini cuma menerima `id`, tanpa konteks user
    // sama sekali -- artinya siapapun yang lolos guard bisa membaca
    // shipment manapun (IDOR). Filter kepemilikan sekarang masuk ke WHERE
    // clause (bukan fetch dulu baru dicek di application code), sama
    // seperti pola di shipments.service.ts.
    async findOne(
        id: number,
        userId: number,
        canViewAll: boolean,
    ): Promise<Shipment> {
        const shipment = await this.prismaService.shipment.findFirst({
            where: canViewAll
                ? { id }
                : {
                      id,
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
                shipmentHistories: true,
                payment: true,
            },
        });

        if (!shipment) {
            // 404 generik untuk 2 kemungkinan sekaligus (tidak ada / bukan
            // milikmu) -- mencegah enumeration attack, sama seperti pola
            // yang sudah dipakai di shipments.service.ts.
            throw new NotFoundException(`Shipment with ID ${id} not found`);
        }

        return shipment;
    }
}
