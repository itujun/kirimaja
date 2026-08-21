import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PermissionsService {
    constructor(private prismaService: PrismaService) {}
    async findAll(): Promise<Permission[]> {
        return await this.prismaService.permission.findMany();
    }
}
