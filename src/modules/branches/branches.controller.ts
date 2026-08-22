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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { Branch } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) {}

    @Post()
    @RequirePermission('branches.create')
    async create(
        @Body() createBranchDto: CreateBranchDto,
    ): Promise<BaseResponse<Branch>> {
        return {
            message: 'Branch created successfully',
            data: await this.branchesService.create(createBranchDto),
        };
    }

    @Get()
    @RequirePermission('branches.read')
    async findAll(): Promise<BaseResponse<Branch[]>> {
        return {
            message: 'Branches retrieved successfully',
            data: await this.branchesService.findAll(),
        };
    }

    @Get(':id')
    @RequirePermission('branches.read')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<Branch>> {
        return {
            message: `Branch with ID ${id} retrieved successfully`,
            data: await this.branchesService.findOne(id),
        };
    }

    @Patch(':id')
    @RequirePermission('branches.update')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBranchDto: UpdateBranchDto,
    ): Promise<BaseResponse<Branch>> {
        return {
            message: `Branch with ID ${id} updated successfully`,
            data: await this.branchesService.update(+id, updateBranchDto),
        };
    }

    @Delete(':id')
    @RequirePermission('branches.delete')
    async remove(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<Branch>> {
        await this.branchesService.remove(id);
        return {
            message: `Branch with ID ${id} deleted successfully`,
            data: null,
        };
    }
}
