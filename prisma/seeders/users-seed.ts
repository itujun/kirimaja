import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export async function usersSeed() {
    const usersPath = path.resolve(__dirname, 'data', 'users.json');
    const usersRaw = fs.readFileSync(usersPath, 'utf-8');
    const users = JSON.parse(usersRaw).data;

    for (const user of users) {
        const role = await prisma.role.findFirst({
            where: { key: user.roleKey },
        });

        if (!role) {
            console.warn(
                `⚠️  Role with key "${user.roleKey}" not found. Skipping user "${user.name}" (${user.email}).`,
            );
            continue;
        }

        const hashedPassword = await bcrypt.hash(user.password, 12);

        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                name: user.name,
                email: user.email,
                password: hashedPassword,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber,
                roleId: role.id,
            },
        });

        console.log(`✅ User for role "${user.roleKey}" seeded`);
    }
}

// For running directly
if (require.main === module) {
    usersSeed()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
