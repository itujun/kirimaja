import { Module } from '@nestjs/common';
import { EmployeeBranchesService } from './employee-branches.service';
import { EmployeeBranchesController } from './employee-branches.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [EmployeeBranchesController],
    providers: [EmployeeBranchesService],
})
export class EmployeeBranchesModule {}
