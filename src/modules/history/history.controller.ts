import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Req,
    UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';

@Controller('history')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class HistoryController {
    constructor(private readonly historyService: HistoryService) {}

    @Get()
    @RequirePermission('shipments.read')
    async findAll(
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<Shipment[]>> {
        return {
            message: 'Shipments retrieved successfully',
            data: await this.historyService.findAll(req.user!),
        };
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with ID ${id} retrieved successfully`,
            data: await this.historyService.findOne(id),
        };
    }
}
