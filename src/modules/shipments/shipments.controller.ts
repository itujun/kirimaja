import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/permission.decorator';

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

    // @Get()
    // async findAll(): Promise<BaseResponse<Shipment[]>> {
    //     return this.shipmentsService.findAll();
    // }

    // @Get(':id')
    // async findOne(
    //     @Param('id', ParseIntPipe) id: number,
    // ): Promise<BaseResponse<Shipment>> {
    //     return this.shipmentsService.findOne(+id);
    // }

    // @Patch(':id')
    // async update(
    //     @Param('id', ParseIntPipe) id: number,
    //     @Body() updateShipmentDto: UpdateShipmentDto,
    // ): Promise<BaseResponse<Shipment>> {
    //     return this.shipmentsService.update(+id, updateShipmentDto);
    // }

    // @Delete(':id')
    // async remove(
    //     @Param('id', ParseIntPipe) id: number,
    // ): Promise<BaseResponse<void>> {
    //     return this.shipmentsService.remove(+id);
    // }
}
