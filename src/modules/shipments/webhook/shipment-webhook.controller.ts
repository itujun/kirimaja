import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ShipmentsService } from '../shipments.service';
import { XenditWebhookDto } from '../dto/xendit-webhook.dto';
import { XenditWebhookGuard } from './xendit-webhook.guard';

@Controller('shipments/webhook')
export class ShipmentWebhookController {
    constructor(private readonly shipmentService: ShipmentsService) {}

    @Post('xendit')
    @UseGuards(XenditWebhookGuard)
    @HttpCode(HttpStatus.OK)
    async handlePaymentWebhook(
        @Body() webhookData: XenditWebhookDto,
    ): Promise<{ message: string }> {
        await this.shipmentService.handlePaymentWebhook(webhookData);
        return { message: 'Webhook received successfully' };
    }
}
