import {
    Controller,
    Get,
    Body,
    Patch,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { BaseResponse } from './interface/base-response.interface';
import { RoleResponse } from '../auth/response/auth-login.response';
import { UpdateRoleDTO } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    // GET tetap boleh diakses siapapun yang login (misalnya buat
    // menampilkan nama role di UI) -- yang perlu dikunci ketat adalah
    // aksi MENGUBAHNYA.
    @Get()
    async findAll(): Promise<BaseResponse<RoleResponse[]>> {
        return {
            message: 'Roles retrieved successfully',
            data: await this.rolesService.findAll(),
        };
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<RoleResponse>> {
        return {
            message: `Role with ID ${id} retrieved successfully`,
            data: await this.rolesService.findOne(id),
        };
    }

    // FIX: sebelumnya endpoint ini cuma dilindungi JwtAuthGuard -- artinya
    // SIAPAPUN yang berhasil login (termasuk role 'customer') bisa PATCH
    // role manapun, termasuk mengubah permission role-nya sendiri
    // (privilege escalation). Sekarang wajib punya permission
    // 'permissions.manage'.
    @Patch(':id')
    @RequirePermission('permissions.manage')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateRoleDto: UpdateRoleDTO,
    ): Promise<BaseResponse<RoleResponse>> {
        return {
            message: `Role with ID ${id} updated successfully`,
            data: await this.rolesService.update(id, updateRoleDto),
        };
    }
}
