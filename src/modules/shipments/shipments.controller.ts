import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
    Req,
    Res,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Request, Response } from 'express';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) {}

    @Post()
    @RequirePermission('shipments.create')
    async create(
        @Body() createShipmentDto: CreateShipmentDto,
    ): Promise<BaseResponse<Shipment>> {
        return {
            data: await this.shipmentsService.create(createShipmentDto),
            message: 'Shipment created successfully',
        };
    }

    @Get()
    async findAll(
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<Shipment[]>> {
        return {
            message: 'Shipments retrieved successfully',
            data: await this.shipmentsService.findAll(req.user.id),
        };
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with ID ${id} retrieved successfully`,
            data: await this.shipmentsService.findOne(id),
        };
    }

    @Get(':id/pdf')
    async generateShipmentPdf(
        @Param('id', ParseIntPipe) id: number,
        @Res() res: Response,
    ): Promise<void> {
        const pdfBuffer = await this.shipmentsService.generateShipmentPdf(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="shipment-${id}.pdf"`,
        });
        res.send(pdfBuffer);
    }

    @Get('track/:trackingNumber')
    async findByTrackingNumber(
        @Param('trackingNumber') trackingNumber: string,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} retrieved successfully`,
            data: await this.shipmentsService.findShipmentByTrackingNumber(
                trackingNumber,
            ),
        };
    }
}
