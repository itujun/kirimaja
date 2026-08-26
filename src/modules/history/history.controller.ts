import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserRole } from 'src/common/enum/user-role.enum';

@Controller('history')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class HistoryController {
    constructor(private readonly historyService: HistoryService) {}

    private canViewAllShipments(user: AuthenticatedUser): boolean {
        return user.role.id === UserRole.SUPER_ADMIN;
    }

    @Get()
    @RequirePermission('history.read')
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment[]>> {
        return {
            message: 'Shipments retrieved successfully',
            data: await this.historyService.findAll(
                user.id,
                this.canViewAllShipments(user),
            ),
        };
    }

    @Get(':id')
    @RequirePermission('history.read')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with ID ${id} retrieved successfully`,
            data: await this.historyService.findOne(
                id,
                user.id,
                this.canViewAllShipments(user),
            ),
        };
    }
}
