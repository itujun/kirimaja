import { Prisma } from '@prisma/client';

// Single source of truth untuk struktur include "Role + relasi permission-nya".
// Dipakai di RolesService, PermissionsService, AuthService, dan JwtStrategy
// supaya bentuk query-nya selalu konsisten di semua tempat.
//
// Prisma.validator memastikan TypeScript memvalidasi objek ini sesuai
// skema Prisma yang sebenarnya (Prisma.RoleInclude) -- kalau kamu salah
// tulis nama relasi, error akan muncul saat compile, bukan saat runtime.
export const ROLE_WITH_PERMISSIONS_INCLUDE =
    Prisma.validator<Prisma.RoleInclude>()({
        rolePermissions: {
            include: { permission: true },
        },
    });

// Tipe hasil query Role dengan include di atas, diturunkan otomatis
// (tidak perlu ditulis manual, dan selalu sinkron dengan include-nya)
export type RoleWithPermissions = Prisma.RoleGetPayload<{
    include: typeof ROLE_WITH_PERMISSIONS_INCLUDE;
}>;

// Single source of truth untuk bentuk "Shipment + relasi lengkapnya".
// Dipakai di ShipmentsService.findAll() (dan findOne(), karena bentuk
// include-nya identik -- daripada duplikat literal include yang sama
// persis di dua tempat).
//
// PENTING: shipmentDetail sengaja include NESTED user & address (bukan
// `shipmentDetail: true` saja). Sebelumnya include shallow ini bikin
// findOne()/findAll() mengembalikan shipmentDetail.user dan
// shipmentDetail.address sebagai `undefined` di response -- padahal
// frontend (halaman pay & detail) mengasumsikan keduanya selalu ada,
// termasuk di beberapa tempat TANPA optional chaining sama sekali
// (`shipment_detail.user.name`). Akibatnya halaman pay CRASH setiap
// kali user selesai membuat shipment (alur paling sering dipakai di
// seluruh aplikasi). Pola ini sudah lebih dulu benar di
// generateShipmentPdf() -- sekarang disamakan di sini supaya SATU
// bentuk include ini konsisten dipakai di semua tempat yang butuh
// data shipment lengkap.
export const SHIPMENT_WITH_RELATIONS_INCLUDE =
    Prisma.validator<Prisma.ShipmentInclude>()({
        shipmentDetail: {
            include: {
                user: true,
                address: true,
            },
        },
        payment: true,
        shipmentHistories: true,
    });

export type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
    include: typeof SHIPMENT_WITH_RELATIONS_INCLUDE;
}>;
