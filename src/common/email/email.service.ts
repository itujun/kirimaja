import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { Env } from 'src/config/env.schema';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private templatePath: string;

    constructor(private readonly configService: ConfigService<Env, true>) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST'),
            port: this.configService.get('SMTP_PORT'),
            secure: this.configService.get('SMTP_SECURE'),
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
        });

        this.templatePath = path.join('./src/common/email/templates');
    }

    private loadTemplate(templateName: string): string {
        const filePath = path.join(this.templatePath, `${templateName}.hbs`);
        return require('fs').readFileSync(filePath, 'utf8');
    }

    private compileTemplate(templateName: string, data: any): string {
        const templateSource = this.loadTemplate(templateName);
        const template = require('handlebars').compile(templateSource);
        return template(data);
    }

    async testingEmail(to: string): Promise<void> {
        const templateData = {
            title: 'Test Email',
            message: 'This is a test email',
        };
        const htmlContent = this.compileTemplate('test-email', templateData);

        const mailOptions = {
            from: this.configService.get('SMTP_EMAIL_SENDER'),
            to,
            subject: 'Test Email',
            html: htmlContent,
        };

        await this.transporter.sendMail(mailOptions);
    }

    async sendEmailPaymentNotification(
        to: string,
        paymentUrl: string,
        shipmentId: number,
        amount: number,
        expiryDate: Date,
    ): Promise<void> {
        const templateData = {
            shipmentId,
            paymentUrl,
            amount: amount.toLocaleString('id-ID'),
            expiryDate: expiryDate.toDateString(),
        };

        const htmlContent = this.compileTemplate(
            'payment-notification',
            templateData,
        );

        const mailOptions = {
            from: this.configService.get('SMTP_EMAIL_SENDER') || '',
            to,
            subject: `Payment Notification for Shipment #${shipmentId}`,
            html: htmlContent,
        };

        await this.transporter.sendMail(mailOptions);
    }
}
