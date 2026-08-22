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
import { EmployeeBranchesService } from './employee-branches.service';
import { CreateEmployeeBranchDto } from './dto/create-employee-branch.dto';
import { UpdateEmployeeBranchDto } from './dto/update-employee-branch.dto';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { EmployeeBranch } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('employee-branches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeeBranchesController {
    constructor(
        private readonly employeeBranchesService: EmployeeBranchesService,
    ) {}

    @Post()
    @RequirePermission('employee.create')
    async create(
        @Body() createEmployeeBranchDto: CreateEmployeeBranchDto,
    ): Promise<BaseResponse<EmployeeBranch>> {
        return {
            message: 'Employee branch created successfully',
            data: await this.employeeBranchesService.create(
                createEmployeeBranchDto,
            ),
        };
    }

    @Get()
    @RequirePermission('employee.read')
    async findAll(): Promise<BaseResponse<EmployeeBranch[]>> {
        return {
            message: 'Employee branches fetched successfully',
            data: await this.employeeBranchesService.findAll(),
        };
    }

    @Get(':id')
    @RequirePermission('employee.read')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<EmployeeBranch>> {
        return {
            message: `Employee branch with ID ${id} fetched successfully`,
            data: await this.employeeBranchesService.findOne(id),
        };
    }

    @Patch(':id')
    @RequirePermission('employee.update')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateEmployeeBranchDto: UpdateEmployeeBranchDto,
    ): Promise<BaseResponse<EmployeeBranch>> {
        return {
            message: `Employee branch with ID ${id} updated successfully`,
            data: await this.employeeBranchesService.update(
                id,
                updateEmployeeBranchDto,
            ),
        };
    }

    @Delete(':id')
    @RequirePermission('employee.delete')
    async remove(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<BaseResponse<EmployeeBranch>> {
        await this.employeeBranchesService.remove(id);
        return {
            message: `Employee branch with ID ${id} deleted successfully`,
            data: null,
        };
    }
}
