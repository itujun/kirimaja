import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeBranchDto } from './dto/create-employee-branch.dto';
import { UpdateEmployeeBranchDto } from './dto/update-employee-branch.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { EmployeeBranch } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

// Pemetaan `type` (yang boleh dipilih user di form) -> `key` role yang
// SEBENARNYA menentukan hak akses. Sengaja dipetakan lewat `key` (string
// stabil), BUKAN ID numerik -- supaya tidak rapuh terhadap urutan seed
// seperti UserRole hardcode yang sebelumnya dipakai di frontend.
const ROLE_KEY_BY_EMPLOYEE_TYPE: Record<string, string> = {
    courier: 'courier',
    admin: 'admin-branch',
};

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

    // FIX (Critical -- privilege escalation): role_id TIDAK LAGI diterima
    // dari client. Di sini kita cari Role yang sesuai berdasarkan `type`,
    // lewat `key` yang stabil -- bukan ID yang dikirim user.
    private async resolveRoleIdForType(type: string): Promise<number> {
        const roleKey = ROLE_KEY_BY_EMPLOYEE_TYPE[type];
        const role = await this.prismaService.role.findUnique({
            where: { key: roleKey },
        });

        if (!role) {
            // Ini menandakan masalah konfigurasi/seed, bukan input user
            // yang salah -- makanya bukan BadRequestException.
            throw new NotFoundException(
                `Role dengan key "${roleKey}" tidak ditemukan. Pastikan seed roles sudah dijalankan.`,
            );
        }

        return role.id;
    }

    // FIX (Critical -- horizontal authorization bypass): sebelumnya tidak
    // ada pengecekan branch sama sekali di service ini -- pembatasan
    // "admin-branch cuma boleh kelola karyawan cabangnya sendiri" HANYA
    // ada di frontend (isEmployeeFromSameBranch), yang bisa dilewati
    // dengan memanggil API langsung. Method ini mencari branch_id milik
    // requester sendiri (lewat EmployeeBranch-nya), dipakai untuk
    // menegakkan pembatasan itu di create/update/remove.
    private async getRequesterOwnBranchId(
        currentUser: AuthenticatedUser,
    ): Promise<number> {
        const ownAssignment = await this.prismaService.employeeBranch.findFirst(
            {
                where: { userId: currentUser.id },
                select: { branchId: true },
            },
        );

        if (!ownAssignment) {
            throw new ForbiddenException(
                'Akun Anda tidak terhubung ke cabang manapun.',
            );
        }

        return ownAssignment.branchId;
    }

    private isAdminBranch(currentUser: AuthenticatedUser): boolean {
        return currentUser.role.key === 'admin-branch';
    }

    async create(
        createEmployeeBranchDto: CreateEmployeeBranchDto,
        currentUser: AuthenticatedUser,
    ): Promise<EmployeeBranch> {
        const branchId = createEmployeeBranchDto.branch_id;

        if (this.isAdminBranch(currentUser)) {
            const ownBranchId = await this.getRequesterOwnBranchId(currentUser);

            // admin-branch cuma boleh membuat karyawan bertipe "courier",
            // dan cuma untuk cabangnya sendiri -- sesuai batasan yang
            // sudah tersirat di UI (dropdown "Tipe" cuma tampilkan
            // "Kurir" untuk admin-branch). Ditolak eksplisit di sini,
            // bukan di-override diam-diam, supaya kalau ada yang mencoba
            // bypass lewat API langsung, dia dapat pesan error yang
            // jelas -- bukan perilaku yang membingungkan.
            if (createEmployeeBranchDto.type !== 'courier') {
                throw new ForbiddenException(
                    'Admin cabang hanya dapat menambahkan karyawan bertipe kurir.',
                );
            }
            if (branchId !== ownBranchId) {
                throw new ForbiddenException(
                    'Admin cabang hanya dapat menambahkan karyawan untuk cabangnya sendiri.',
                );
            }
        }

        const roleId = await this.resolveRoleIdForType(
            createEmployeeBranchDto.type,
        );

        await Promise.all([
            this.validateUniqueEmail(createEmployeeBranchDto.email),
            this.validateBranchExists(branchId),
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
                    roleId,
                },
            });

            const employeeBranch = await tx.employeeBranch.create({
                data: {
                    userId: user.id,
                    branchId,
                    type: createEmployeeBranchDto.type,
                },
            });

            return employeeBranch;
        });
    }

    async findAll(): Promise<EmployeeBranch[]> {
        return await this.prismaService.employeeBranch.findMany({
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
        currentUser: AuthenticatedUser,
    ): Promise<EmployeeBranch> {
        const existingEmployeeBranch = await this.findOne(id);

        if (this.isAdminBranch(currentUser)) {
            const ownBranchId = await this.getRequesterOwnBranchId(currentUser);

            // FIX Critical: sebelumnya tidak ada pengecekan ini sama
            // sekali -- admin-branch bisa update karyawan CABANG LAIN
            // lewat API langsung walau tombol Edit-nya disembunyikan di
            // UI. Ini baris yang menutup celahnya.
            if (existingEmployeeBranch.branchId !== ownBranchId) {
                throw new ForbiddenException(
                    'Anda hanya dapat mengelola karyawan di cabang Anda sendiri.',
                );
            }
            if (
                updateEmployeeBranchDto.type &&
                updateEmployeeBranchDto.type !== 'courier'
            ) {
                throw new ForbiddenException(
                    'Admin cabang hanya dapat mengelola karyawan bertipe kurir.',
                );
            }
            if (
                updateEmployeeBranchDto.branch_id &&
                updateEmployeeBranchDto.branch_id !== ownBranchId
            ) {
                throw new ForbiddenException(
                    'Admin cabang tidak dapat memindahkan karyawan ke cabang lain.',
                );
            }
        }

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

        // Semua validasi & operasi non-DB (hashing) selesai SEBELUM
        // transaction dibuka, supaya transaction tetap singkat.
        await Promise.all(validationPromises);

        const hashedPassword = updateEmployeeBranchDto.password
            ? await bcrypt.hash(updateEmployeeBranchDto.password, 10)
            : undefined;

        // Role cuma ikut diupdate kalau `type` benar-benar dikirim --
        // dan dihitung ulang dari `type`, bukan dari role_id manapun
        // (field itu sudah tidak ada lagi di DTO).
        const roleId = updateEmployeeBranchDto.type
            ? await this.resolveRoleIdForType(updateEmployeeBranchDto.type)
            : undefined;

        return this.prismaService.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: existingEmployeeBranch.userId },
                data: {
                    name: updateEmployeeBranchDto.name,
                    email: updateEmployeeBranchDto.email,
                    phoneNumber: updateEmployeeBranchDto.phone_number,
                    avatar: updateEmployeeBranchDto.avatar,
                    ...(hashedPassword && { password: hashedPassword }),
                    ...(roleId && { roleId }),
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
            };
        });
    }

    async remove(id: number, currentUser: AuthenticatedUser): Promise<void> {
        // Pastikan record ada dulu, biar tetap melempar 404 yang jelas
        // kalau id tidak ditemukan (bukan silent no-op).
        const existingEmployeeBranch = await this.findOne(id);

        if (this.isAdminBranch(currentUser)) {
            const ownBranchId = await this.getRequesterOwnBranchId(currentUser);

            // FIX Critical: sama seperti update() -- tanpa ini,
            // admin-branch bisa menghapus karyawan cabang lain lewat
            // API langsung.
            if (existingEmployeeBranch.branchId !== ownBranchId) {
                throw new ForbiddenException(
                    'Anda hanya dapat mengelola karyawan di cabang Anda sendiri.',
                );
            }
        }

        // Yang dihapus hanya relasi penugasan (EmployeeBranch), BUKAN
        // akun User-nya. User adalah entitas identitas independen yang
        // bisa saja masih aktif di cabang lain, atau tetap harus ada
        // karena punya riwayat shipment/scan log yang dilindungi
        // onDelete: Restrict di schema. Penghapusan akun User secara
        // permanen harus lewat endpoint terpisah (mis. module `users`)
        // dengan intent yang eksplisit, bukan efek samping dari sini.
        await this.prismaService.employeeBranch.delete({ where: { id } });
    }
}
