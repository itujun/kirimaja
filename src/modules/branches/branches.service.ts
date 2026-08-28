import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Branch, Prisma } from '@prisma/client';

@Injectable()
export class BranchesService {
    constructor(private readonly prismaService: PrismaService) {}

    async create(createBranchDto: CreateBranchDto): Promise<Branch> {
        try {
            return await this.prismaService.branch.create({
                data: {
                    name: createBranchDto.name,
                    address: createBranchDto.address,
                    phoneNumber: createBranchDto.phone_number,
                },
            });
        } catch (error) {
            // P2002 = unique constraint violation. `name` di schema
            // Prisma bertanda @unique, jadi ini akan kena kalau ada
            // yang bikin cabang dengan nama yang sudah dipakai. Tanpa
            // ditangkap di sini, project ini TIDAK punya global exception
            // filter untuk Prisma error -- errornya akan lolos jadi
            // 500 generik yang tidak menjelaskan apa-apa ke user.
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    `Nama cabang "${createBranchDto.name}" sudah digunakan. Gunakan nama lain.`,
                );
            }
            throw error;
        }
    }

    async findAll(): Promise<Branch[]> {
        return await this.prismaService.branch.findMany();
    }

    async findOne(id: number): Promise<Branch> {
        const branch = await this.prismaService.branch.findUnique({
            where: { id },
        });
        if (!branch) {
            throw new NotFoundException('Branch not found');
        }
        return branch;
    }

    async update(
        id: number,
        updateBranchDto: UpdateBranchDto,
    ): Promise<Branch> {
        await this.findOne(id);

        try {
            return await this.prismaService.branch.update({
                where: { id },
                data: {
                    name: updateBranchDto.name,
                    address: updateBranchDto.address,
                    phoneNumber: updateBranchDto.phone_number,
                },
            });
        } catch (error) {
            // Sama seperti create(): rename ke nama yang sudah dipakai
            // cabang lain juga kena unique constraint yang sama.
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    `Nama cabang "${updateBranchDto.name}" sudah digunakan. Gunakan nama lain.`,
                );
            }
            throw error;
        }
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);

        try {
            await this.prismaService.branch.delete({ where: { id } });
        } catch (error) {
            // P2003 = foreign key constraint violation. Branch punya
            // relasi onDelete: Restrict ke EmployeeBranch (karyawan
            // masih ditempatkan di cabang ini) dan ShipmentBranchLog
            // (masih ada riwayat scan) -- keduanya sengaja diproteksi
            // supaya tidak terhapus diam-diam. Di sini kita cuma
            // menerjemahkan error mentah Prisma itu jadi pesan yang
            // actionable buat user, bukan mengubah perilaku proteksinya.
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                throw new ConflictException(
                    'Cabang ini tidak dapat dihapus karena masih memiliki data terkait (karyawan yang masih ditempatkan di sini, dan/atau riwayat scan pengiriman). Pindahkan/lepas karyawan dan pastikan tidak ada riwayat aktif sebelum menghapus cabang ini.',
                );
            }
            throw error;
        }
    }
}
