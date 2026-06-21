import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { seedRolesAndPermissions } from "./admin/routes.js";
import { hashPassword } from "./auth/passwords.js";

async function main() {
  await seedRolesAndPermissions();
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "hospital_admin" } });
  const admin = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    create: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      fullName: "Matria Admin",
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      roles: { create: { roleId: adminRole.id } }
    },
    update: {}
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {}
  });
  console.log(`Seeded admin user ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
