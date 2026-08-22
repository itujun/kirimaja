import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './modules/auth/guards/logged-in.guard';
import { PermissionGuard } from './modules/auth/guards/permission.guard';
import { RequirePermission } from './modules/auth/decorators/permission.decorator';
import { EmailService } from './common/email/email.service';
import { QueueService } from './common/queue/queue.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly emailService: EmailService,
        private readonly queueService: QueueService,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get('protected')
    @RequirePermission('view_protected_resource')
    // @RequirePermission('shipments.create')
    getProtected(): string {
        return 'this is a protected resource';
    }

    @Get('send-email-test')
    async testEmail(): Promise<string> {
        await this.queueService.addEmailJob({
            type: 'testing',
            to: 'tesi@example.com',
        });
        return 'test email sent';
    }
}
