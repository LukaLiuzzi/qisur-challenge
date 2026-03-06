const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const products = await prisma.product.count();
    if (products === 0) {
      console.log('No hay productos — ejecutando seed...');
      execSync('npm run db:seed', { stdio: 'inherit' });
    } else {
      console.log('Productos ya existen — saltando seed.');
    }
  } catch (e) {
    console.error('Error comprobando seed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
