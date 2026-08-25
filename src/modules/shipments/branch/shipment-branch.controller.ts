import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ShipmentBranchService } from './shipment-branch.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/logged-in.guard';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RequirePermission } from 'src/modules/auth/decorators/permission.decorator';
import { BaseResponse } from 'src/modules/roles/interface/base-response.interface';
import { ShipmentBranchLog } from '@prisma/client';
import { Request } from 'express';
import { ScanShipmentDto } from '../dto/scan-shipment.dto';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/strategies/jwt.strategy';

@Controller('shipments/branch')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShipmentBranchController {
    constructor(
        private readonly shipmentBranchService: ShipmentBranchService,
    ) {}

    @Get('logs')
    @RequirePermission('shipment-branch.read')
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<ShipmentBranchLog[]>> {
        // Tidak dibungkus try/catch generik -- exception dari service
        // (mis. NotFoundException kalau user tidak punya branch) dibiarkan
        // mengalir apa adanya ke NestJS exception filter, supaya status
        // code & pesan errornya tetap akurat. Membungkusnya jadi
        // BadRequestException generik justru menyembunyikan akar masalah.
        const logs = await this.shipmentBranchService.findAll(user);

        return {
            data: logs,
            message: 'Shipments logs retrieved successfully',
        };
    }

    // FIX: sebelumnya endpoint ini TIDAK punya @RequirePermission sama
    // sekali. Karena PermissionGuard otomatis meloloskan route yang tidak
    // punya metadata permission (lihat permission.guard.ts), akibatnya
    // SIAPAPUN yang sudah login -- termasuk role customer/courier -- bisa
    // memindai status shipment manapun. Permission 'shipment-branch.input'
    // sudah tersedia di seed (permissions.json) dan sudah di-assign ke role
    // super-admin & admin-branch (role-permissions.json), tinggal decorator
    // ini yang belum dipasang.
    @Post('scan')
    @RequirePermission('shipment-branch.input')
    async scanShipment(
        @Body() scanData: ScanShipmentDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<ShipmentBranchLog>> {
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
