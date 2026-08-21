import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/logged-in/logged-in.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { BaseResponse } from '../roles/interface/base-response.interface';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    async findAll(): Promise<BaseResponse<Permission[]>> {
        return {
            message: 'Permissions retrieved successfully',
            data: await this.permissionsService.findAll(),
        };
    }
}
