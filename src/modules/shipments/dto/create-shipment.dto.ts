import { z } from 'zod';

// Dibatasi ke nilai yang benar-benar didukung oleh calculateShipmentCost().
// Sebelumnya field ini cuma divalidasi sebagai "string tidak kosong", jadi
// nilai sembarangan (typo, atau nilai yang belum didukung) lolos validasi
// lalu diam-diam di-fallback ke tarif "regular" oleh calculateShipmentCost()
// TANPA error apa pun -- pelanggan bisa merasa pilih "same_day" tapi
// ditagih tarif "regular", dan nilai sampahnya ikut tersimpan ke DB.
const DELIVERY_TYPES = ['same_day', 'next_day', 'regular'] as const;

const createShipmentSchema = z.object({
    pickup_address_id: z
        .number({
            required_error: 'Pickup address ID is required',
            invalid_type_error: 'Pickup address id must be a number',
        })
        .int({
            message: 'Pickup address ID must be an integer',
        }),
    destination_address: z
        .string({
            required_error: 'Destination address is required',
            invalid_type_error: 'Destination address must be a string',
        })
        .min(1, 'Destination address must be at least 1 characters'),
    recipient_name: z
        .string({
            required_error: 'Recipient name is required',
            invalid_type_error: 'Recipient name must be a string',
        })
        .min(1, 'Recipient name must be at least 1 characters'),
    recipient_phone: z
        .string({
            required_error: 'Recipient phone is required',
            invalid_type_error: 'Recipient phone must be a string',
        })
        .min(10, 'Recipient phone must be at least 10 characters'),
    weight: z
        .number({
            required_error: 'Weight is required',
            invalid_type_error: 'Weight must be a number',
        })
        .positive({
            message: 'Weight must be a positive number',
        }),
    package_type: z
        .string({
            required_error: 'Package type is required',
            invalid_type_error: 'Package type must be a string',
        })
        .min(1, 'Package type must be at least 1 characters'),
    delivery_type: z.enum(DELIVERY_TYPES, {
        required_error: 'Delivery type is required',
        invalid_type_error: `Delivery type must be one of: ${DELIVERY_TYPES.join(', ')}`,
    }),
});

export class CreateShipmentDto {
    static schema: z.ZodObject<any> = createShipmentSchema;

    constructor(
        public pickup_address_id: number,
        public destination_address: string,
        public recipient_name: string,
        public recipient_phone: string,
        public weight: number,
        public package_type: string,
        public delivery_type: (typeof DELIVERY_TYPES)[number],
    ) {}
}

// Di-export supaya bisa dipakai ulang sebagai tipe parameter di
// ShipmentsService.calculateShipmentCost(), alih-alih ditulis `string`
// generik di sana (yang membuka celah delivery_type sembarangan tadi).
export type DeliveryType = (typeof DELIVERY_TYPES)[number];
