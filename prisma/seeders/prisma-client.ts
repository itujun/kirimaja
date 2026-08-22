import { PrismaClient } from '@prisma/client';

// Singleton instance dipakai bersama oleh semua seeder file.
// Jangan bikin `new PrismaClient()` lagi di file lain — import ini saja.
export const prisma = new PrismaClient();
