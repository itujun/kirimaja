import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/logged-in/logged-in.guard';
import { BaseResponse } from './interface/base-response.interface';
import { RoleResponse } from '../auth/response/auth-login.response';
import { UpdateRoleDTO } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    async findAll(): Promise<BaseResponse<RoleResponse[]>> {
        return {
            message: 'Roles retrieved successfully',
            data: await this.rolesService.findAll(),
        };
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
    ): Promise<BaseResponse<RoleResponse>> {
        return {
            message: `Role with ID ${id} retrieved successfully`,
            data: await this.rolesService.findOne(+id),
        };
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateRoleDto: UpdateRoleDTO,
    ): Promise<BaseResponse<RoleResponse>> {
        return {
            message: `Role with ID ${id} updated successfully`,
            data: await this.rolesService.update(+id, updateRoleDto),
        };
    }
}
