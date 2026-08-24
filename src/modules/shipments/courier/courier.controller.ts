import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/logged-in.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ShipmentCourierService } from './courier.service';
import { BaseResponse } from 'src/modules/roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';
import { RequirePermission } from 'src/modules/auth/decorators/permission.decorator';
import { AuthenticatedUser } from 'src/modules/auth/strategies/jwt.strategy';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

@Controller('shipments/courier')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShipmentsCourierController {
    constructor(private readonly shipmentsService: ShipmentCourierService) {}

    @Get('list')
    @RequirePermission('delivery.read')
    async findAll(): Promise<BaseResponse<Shipment[]>> {
        return {
            message: 'Shipments retrieved successfully',
            data: await this.shipmentsService.findAll(),
        };
    }

    @Get('pick/:trackingNumber')
    @RequirePermission('delivery.update')
    async pickShipment(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} picked successfully`,
            data: await this.shipmentsService.pickShipment(
                trackingNumber,
                user.id,
            ),
        };
    }
}
