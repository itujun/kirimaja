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

    async findAll(): Promise<EmployeeBranch[]> {
        return this.prismaService.employeeBranch.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        avatar: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
    }

    async findOne(id: number): Promise<EmployeeBranch> {
        const employeeBranch =
            await this.prismaService.employeeBranch.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                            avatar: true,
                        },
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                },
            });

        if (!employeeBranch) {
            throw new NotFoundException(
                `EmployeeBranch with ID ${id} not found`,
            );
        }
        return employeeBranch;
    }

    async update(
        id: number,
        updateEmployeeBranchDto: UpdateEmployeeBranchDto,
    ): Promise<EmployeeBranch> {
        const existingEmployeeBranch = await this.findOne(id);

        const validationPromises: Promise<void>[] = [];

        if (updateEmployeeBranchDto.email) {
            validationPromises.push(
                this.validateUniqueEmail(
                    updateEmployeeBranchDto.email,
                    existingEmployeeBranch.userId,
                ),
            );
        }

        if (updateEmployeeBranchDto.branch_id) {
            validationPromises.push(
                this.validateBranchExists(updateEmployeeBranchDto.branch_id),
            );
        }

        if (updateEmployeeBranchDto.role_id) {
            validationPromises.push(
                this.validateRoleExists(updateEmployeeBranchDto.role_id),
            );
        }

        return this.prismaService.$transaction(async (tx) => {
            await Promise.all(validationPromises);

            const updatedUser = await tx.user.update({
                where: { id: existingEmployeeBranch.userId },
                data: {
                    name: updateEmployeeBranchDto.name,
                    email: updateEmployeeBranchDto.email,
                    phoneNumber: updateEmployeeBranchDto.phone_number,
                    avatar: updateEmployeeBranchDto.avatar,
                    ...(updateEmployeeBranchDto.password && {
                        password: await bcrypt.hash(
                            updateEmployeeBranchDto.password,
                            10,
                        ),
                    })
                    roleId: updateEmployeeBranchDto.role_id,
                },
            });

            const updateEmployeeBranch = await tx.employeeBranch.update({
                where: { id },
                data: {
                    branchId: updateEmployeeBranchDto.branch_id,
                    type: updateEmployeeBranchDto.type,
                },
            });

            return {
              ...updateEmployeeBranch,
              user: updatedUser,
            }
        });
    }

    async remove(id: number): Promise<void> {
        const employeeBranch = await this.findOne(id);
        return this.prismaService.$transaction(async (tx) => {
            await tx.user.delete({ where: { id: employeeBranch.userId } });
            await tx.employeeBranch.delete({ where: { id } });
        })
    }
}
