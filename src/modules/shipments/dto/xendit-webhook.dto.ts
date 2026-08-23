import { z, ZodObject } from 'zod';

const xenditWebhookSchema = z.object({
    id: z.string(),
    external_id: z.string(),
    user_id: z.string().optional(),
    is_high: z.boolean().optional(),
    payment_method: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED']),
    merchant_name: z.string().optional(),
    amount: z.number(),
    paid_amount: z.number().optional(),
    bank_code: z.string().optional(),
    paid_at: z.string().optional(),
    payer_email: z.string().optional(),
    description: z.string().optional(),
    adjusted_received_amount: z.number().optional(),
    fees_paid_amount: z.number().optional(),
    updated: z.string().optional(),
    created: z.string().optional(),
    currency: z.string().optional(),
    payment_channel: z.string().optional(),
    payment_destination: z.string().optional(),
});

export class XenditWebhookDto {
    static schema: ZodObject<any> = xenditWebhookSchema;

    constructor(
        // required dulu
        public readonly id: string,
        public readonly external_id: string,
        public readonly status:
            | 'PENDING'
            | 'PAID'
            | 'SETTLED'
            | 'EXPIRED'
            | 'FAILED',
        public readonly amount: number,
        // optional setelahnya
        public readonly user_id?: string,
        public readonly is_high?: boolean,
        public readonly payment_method?: string,
        public readonly merchant_name?: string,
        public readonly paid_amount?: number,
        public readonly bank_code?: string,
        public readonly paid_at?: string,
        public readonly payer_email?: string,
        public readonly description?: string,
        public readonly adjusted_received_amount?: number,
        public readonly fees_paid_amount?: number,
        public readonly updated?: string,
        public readonly created?: string,
        public readonly currency?: string,
        public readonly payment_channel?: string,
        public readonly payment_destination?: string,
    ) {}
}
