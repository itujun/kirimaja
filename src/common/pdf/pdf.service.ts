import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';

export interface ShipmentPdfData {
    // Shipment info
    trackingNumber: string;
    shipmentId: number;
    createdAt: Date;
    deliveryType: string;
    packageType: string;
    weight: number;
    price: number;
    distance: number;
    paymentStatus: string;
    deliveryStatus: string;

    // Price breakdown
    basePrice?: number;
    weightPrice?: number;
    distancePrice?: number;

    // Sender info
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    pickupAddress: string;

    // Recipient info
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;

    // QR code
    qrCodePath?: string;
}

@Injectable()
export class PdfService {
    private templateCache = new Map<string, Handlebars.TemplateDelegate>();

    async generateShipmentPdf(data: ShipmentPdfData): Promise<Buffer> {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });

        try {
            const page = await browser.newPage();
            const htmlContent = await this.generateShipmentPdfHtml(data);
            await page.setContent(htmlContent, { waitUntil: 'load' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '10px',
                    bottom: '20px',
                    left: '10px',
                },
            });

            return Buffer.from(pdfBuffer);
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    async generateShipmentPdfHtml(data: ShipmentPdfData): Promise<string> {
        const template = await this.loadTemplate('shipping-pdf.hbs');
        const css = await this.loadCssFile('shipping-pdf.css');

        const qrCodeBase64 = data.qrCodePath
            ? this.getBase64Image(`public/${data.qrCodePath}`)
            : '';

        const templateDate = {
            trackingNumber: data.trackingNumber,
            shipmentId: data.shipmentId,
            createdDate: new Date(data.createdAt).toLocaleDateString('id-ID'),
            deliveryType: data.deliveryType,
            packageType: data.deliveryType,
            weight: data.weight,
            price: data.price.toLocaleString('id-ID'),
            distance: data.distance.toFixed(2),
            paymentStatus: data.paymentStatus,
            deliveryStatus: data.deliveryStatus,
            basePrice: data.basePrice?.toLocaleString('id-ID') || '0',
            weightPrice: data.weightPrice?.toLocaleString('id-ID') || '0',
            distancePrice: data.distancePrice?.toLocaleString('id-ID') || '0',
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            senderPhone: data.senderPhone,
            pickupAddress: data.pickupAddress,
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            destinationAddress: data.deliveryAddress,
            qrCode: qrCodeBase64,
            generatedDate: new Date().toLocaleDateString('id-ID'),
            styles: css,
        };

        return template(templateDate);
    }

    private async loadTemplate(
        templateName: string,
    ): Promise<HandlebarsTemplateDelegate> {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }

        const templatePath = path.join(
            './src/common/pdf',
            'templates',
            templateName,
        );
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = Handlebars.compile(templateSource);
        this.templateCache.set(templateName, template);
        return template;
    }

    private async loadCssFile(cssFileName: string): Promise<string> {
        const cssPath = path.join('./src/common/pdf', 'templates', cssFileName);
        return fs.readFileSync(cssPath, 'utf8');
    }

    private getBase64Image(imagePath: string): string | undefined {
        try {
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                return base64Image;
            } else {
                console.warn(`QR code file not found at path: ${imagePath}`);
            }
        } catch (error) {
            console.error('Error reading QR code file:', error);
            return;
        }
    }
}
