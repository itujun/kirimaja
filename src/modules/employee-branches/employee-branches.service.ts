import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeBranchDto } from './dto/create-employee-branch.dto';
import { UpdateEmployeeBranchDto } from './dto/update-employee-branch.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { EmployeeBranch } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeBranchesService {
    constructor(private prismaService: PrismaService) {}

    private async validateUniqueEmail(
        email: string,
        excludeUserId?: number,
    ): Promise<void> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });

        if (existingUser && existingUser.id !== excludeUserId) {
            throw new BadRequestException('Email already exists');
        }
    }

    private async validateBranchExists(branch_id: number): Promise<void> {
        const branch = await this.prismaService.branch.findUnique({
            where: { id: branch_id },
        });
        if (!branch) {
            throw new NotFoundException(
                `Branch with ID ${branch_id} not found`,
            );
        }
    }

    private async validateRoleExists(role_id: number): Promise<void> {
        const role = await this.prismaService.role.findUnique({
            where: { id: role_id },
        });
        if (!role) {
            throw new NotFoundException(`Role with ID ${role_id} not found`);
        }
    }

    async create(
        createEmployeeBranchDto: CreateEmployeeBranchDto,
    ): Promise<EmployeeBranch> {
        await Promise.all([
            this.validateUniqueEmail(createEmployeeBranchDto.email),
            this.validateBranchExists(createEmployeeBranchDto.branch_id),
            this.validateRoleExists(createEmployeeBranchDto.role_id),
        ]);

        return this.prismaService.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: createEmployeeBranchDto.name,
                    email: createEmployeeBranchDto.email,
                    password: await bcrypt.hash(
                        createEmployeeBranchDto.password,
                        10,
                    ),
                    avatar: createEmployeeBranchDto.avatar,
                    phoneNumber: createEmployeeBranchDto.phone_number,
                    roleId: createEmployeeBranchDto.role_id,
                },
            });

            const employeeBranch = await tx.employeeBranch.create({
                data: {
                    userId: user.id,
                    branchId: createEmployeeBranchDto.branch_id,
                    type: createEmployeeBranchDto.type,
                },
            });

            return employeeBranch;
        });
    }

    findAll() {
        return `This action returns all employeeBranches`;
    }

    findOne(id: number) {
        return `This action returns a #${id} employeeBranch`;
    }

    update(id: number, updateEmployeeBranchDto: UpdateEmployeeBranchDto) {
        return `This action updates a #${id} employeeBranch`;
    }

    remove(id: number) {
        return `This action removes a #${id} employeeBranch`;
    }
}
