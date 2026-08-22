import { Injectable } from '@nestjs/common';
import Xendit from 'xendit-node';

const xendit = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY || '',
});

const { Invoice } = xendit;

@Injectable()
export class XenditService {
    async createInvoice(data: {
        externalId: string;
        amount: number;
        [key: string]: any;
    }): Promise<any> {
        return await Invoice.createInvoice({ data });
    }
}
