import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [HistoryController],
    providers: [HistoryService],
})
export class HistoryModule {}
