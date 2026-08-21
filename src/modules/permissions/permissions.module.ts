import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PermissionsController],
    providers: [PermissionsService],
})
export class PermissionsModule {}
