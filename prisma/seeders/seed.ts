import { rolesSeed } from './roles-seed';
import { usersSeed } from './users-seed';
import { permissionsSeed } from './permissions-seed';
import { branchesSeed } from './branches-seed';
import { employeeBranchesSeed } from './employee-branches-seed';
import { prisma } from './prisma-client';

async function main() {
    console.log('🌱 Mulai seeding database...');

    // 1. Seed roles terlebih dahulu (dependency untuk users)
    await rolesSeed();

    // 2. Seed permissions (dependency untuk role-permissions)
    await permissionsSeed();

    // 3. Seed users terakhir (membutuhkan roles)
    await usersSeed();

    // 4. Seed branches
    await branchesSeed();

    // 5. Seed employee branches
    await employeeBranchesSeed();

    console.log('🎉 Seeding selesai!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
