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

    // FIX: sebelumnya endpoint GET ini boleh diakses SIAPAPUN yang login
    // (termasuk role 'customer'), dengan alasan "buat menampilkan nama
    // role di UI". Tapi response-nya (RoleResponse) ternyata juga
    // menyertakan SELURUH daftar permission tiap role -- artinya semua
    // user, termasuk yang privilege-nya paling rendah, bisa lihat persis
    // permission apa saja yang dimiliki super-admin/admin-branch dengan
    // langsung memanggil endpoint ini (Postman/curl), walau frontend
    // sudah menyembunyikan halaman /role di balik permission
    // "permissions.read". Sudah dicek: tidak ada alur lain di frontend
    // (termasuk form tambah karyawan) yang bergantung pada endpoint ini
    // diakses tanpa permission -- form tambah karyawan pakai role_id
    // yang sudah ditentukan di kode, bukan dropdown dari endpoint ini.
    @Get()
    @RequirePermission('permissions.read')
    async findAll(): Promise<BaseResponse<RoleResponse[]>> {
        return {
            message: 'Roles retrieved successfully',
            data: await this.rolesService.findAll(),
        };
    }

    @Get(':id')
    @RequirePermission('permissions.read')
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
