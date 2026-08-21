import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
    controllers: [RolesController],
    providers: [RolesService, PrismaService],
})
export class RolesModule {}
