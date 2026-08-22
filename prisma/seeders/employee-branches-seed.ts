import { prisma } from './prisma-client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from './constants';

export async function employeeBranchesSeed() {
    const employeeBranchesPath = path.resolve(
        __dirname,
        'data',
        'employee-branches.json',
    );
    const employeeBranchesRaw = fs.readFileSync(employeeBranchesPath, 'utf-8');
    const employeeBranches = JSON.parse(employeeBranchesRaw).data;

    for (const employeeBranch of employeeBranches) {
        const role = await prisma.role.findFirst({
            where: { key: employeeBranch.role_key },
        });
        if (!role) {
            console.warn(
                `⚠️  Role with key "${employeeBranch.role_key}" not found. Skipping employee branch "${employeeBranch.name}" (${employeeBranch.email}).`,
            );
            continue;
        }

        const branch = await prisma.branch.findFirst({
            where: { name: employeeBranch.branch_name },
        });
        if (!branch) {
            console.warn(
                `⚠️  Branch with name "${employeeBranch.branch_name}" not found. Skipping employee branch "${employeeBranch.name}" (${employeeBranch.email}).`,
            );
            continue;
        }

        const user = await prisma.user.upsert({
            where: { email: employeeBranch.email },
            update: {},
            create: {
                name: employeeBranch.name,
                email: employeeBranch.email,
                phoneNumber: employeeBranch.phoneNumber,
                password: await bcrypt.hash(
                    employeeBranch.password,
                    BCRYPT_SALT_ROUNDS,
                ),
                avatar: employeeBranch.avatar || null,
                roleId: role.id,
            },
        });

        const existingEmployeeBranch = await prisma.employeeBranch.findFirst({
            where: { userId: user.id, branchId: branch.id },
        });
        if (existingEmployeeBranch) {
            console.warn(
                `⚠️  Employee branch for user "${user.email}" and branch "${branch.name}" already exists, skipping).`,
            );
            continue;
        }

        await prisma.employeeBranch.create({
            data: {
                userId: user.id,
                branchId: branch.id,
                type: employeeBranch.type,
            },
        });
        console.log(
            `🌱 Employee branch for user "${user.email}" and branch "${branch.name}" seeded`,
        );
    }
}

// For running directly
if (require.main === module) {
    employeeBranchesSeed()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
