import { Module } from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { UserAddressesController } from './user-addresses.controller';
import { OpenCageService } from 'src/common/opencage/opencage.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [UserAddressesController],
    providers: [UserAddressesService, OpenCageService],
})
export class UserAddressesModule {}
