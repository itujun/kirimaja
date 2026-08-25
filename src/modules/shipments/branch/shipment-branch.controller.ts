import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ShipmentBranchService } from './shipment-branch.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/logged-in.guard';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { RequirePermission } from 'src/modules/auth/decorators/permission.decorator';
import { BaseResponse } from 'src/modules/roles/interface/base-response.interface';
import { ShipmentBranchLog } from '@prisma/client';
import { Request } from 'express';
import { ScanShipmentDto } from '../dto/scan-shipment.dto';

@Controller('shipments/branch')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShipmentBranchController {
    constructor(
        private readonly shipmentBranchService: ShipmentBranchService,
    ) {}

    @Get('logs')
    @RequirePermission('shipment-branch.read')
    async findAll(
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<ShipmentBranchLog[]>> {
        try {
            const user = req.user;
            const logs = await this.shipmentBranchService.findAll(user);

            return {
                data: logs,
                message: 'Shipments logs retrieved successfully',
            };
        } catch (error) {
            throw new BadRequestException('Failed to retrieve shipments logs');
        }
    }

    @Post('scan')
    async scanShipment(
        @Body() scanData: ScanShipmentDto,
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<ShipmentBranchLog>> {
        const user = req.user;
        const shipment = await this.shipmentBranchService.scanShipment(
            scanData,
            user.id,
        );

        return {
            data: shipment,
            message: 'Shipment scanned successfully',
        };
    }
}
