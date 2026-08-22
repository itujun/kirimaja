import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmployeeBranchesService } from './employee-branches.service';
import { CreateEmployeeBranchDto } from './dto/create-employee-branch.dto';
import { UpdateEmployeeBranchDto } from './dto/update-employee-branch.dto';

@Controller('employee-branches')
export class EmployeeBranchesController {
  constructor(private readonly employeeBranchesService: EmployeeBranchesService) {}

  @Post()
  create(@Body() createEmployeeBranchDto: CreateEmployeeBranchDto) {
    return this.employeeBranchesService.create(createEmployeeBranchDto);
  }

  @Get()
  findAll() {
    return this.employeeBranchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeBranchesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeBranchDto: UpdateEmployeeBranchDto) {
    return this.employeeBranchesService.update(+id, updateEmployeeBranchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeBranchesService.remove(+id);
  }
}
