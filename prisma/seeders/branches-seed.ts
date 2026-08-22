import { prisma } from './prisma-client';
import * as fs from 'fs';
import * as path from 'path';

export async function branchesSeed() {
    const branchesPath = path.resolve(__dirname, 'data', 'branches.json');
    const branchesRaw = fs.readFileSync(branchesPath, 'utf-8');
    const branches = JSON.parse(branchesRaw).data;

    for (const branch of branches) {
        const existingBranch = await prisma.branch.findFirst({
            where: { name: branch.name },
        });

        if (!existingBranch) {
            await prisma.branch.create({
                data: {
                    name: branch.name,
                    address: branch.address,
                    phoneNumber: branch.phoneNumber,
                },
            });
            console.log(`🌱 Branch "${branch.name}" seeded`);
        } else {
            console.log(
                `⚠️  Branch "${branch.name}" already exists. Skipping...`,
            );
        }
    }
}

// For running directly
if (require.main === module) {
    branchesSeed()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
