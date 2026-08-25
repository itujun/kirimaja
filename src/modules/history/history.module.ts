import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PermissionsService } from '../permissions/permissions.service';

@Module({
    imports: [PrismaModule],
    controllers: [HistoryController],
    providers: [HistoryService, PermissionsService],
})
export class HistoryModule {}
