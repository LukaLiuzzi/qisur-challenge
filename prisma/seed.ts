import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categoryNames = [
  'Iluminación',
  'Energía Solar',
  'Automatización',
  'Climatización',
  'Seguridad',
  'Redes',
  'Audio & Video',
  'Domótica',
  'Herramientas',
  'Accesorios',
];

const productData = [
  {
    name: 'Panel Solar 400W',
    description: 'Panel monocristalino de alta eficiencia',
    price: 250.0,
    stock: 50,
    categories: ['Energía Solar'],
  },
  {
    name: 'Inversor 3000W',
    description: 'Inversor de onda pura para sistemas solares',
    price: 320.0,
    stock: 30,
    categories: ['Energía Solar'],
  },
  {
    name: 'Lámpara LED 12W',
    description: 'Lámpara LED de bajo consumo',
    price: 8.5,
    stock: 200,
    categories: ['Iluminación'],
  },
  {
    name: 'Tira LED RGB 5m',
    description: 'Tira LED multicolor con control remoto',
    price: 22.0,
    stock: 150,
    categories: ['Iluminación', 'Domótica'],
  },
  {
    name: 'Termostato inteligente',
    description: 'Termostato WiFi con control por app',
    price: 75.0,
    stock: 60,
    categories: ['Climatización', 'Automatización'],
  },
  {
    name: 'Cámara IP 1080p',
    description: 'Cámara de seguridad con visión nocturna',
    price: 55.0,
    stock: 80,
    categories: ['Seguridad'],
  },
  {
    name: 'Router WiFi 6',
    description: 'Router de última generación 802.11ax',
    price: 120.0,
    stock: 40,
    categories: ['Redes'],
  },
  {
    name: 'Altavoz inteligente',
    description: 'Altavoz con asistente de voz integrado',
    price: 65.0,
    stock: 70,
    categories: ['Audio & Video', 'Domótica'],
  },
  {
    name: 'Sensor de movimiento',
    description: 'Sensor PIR para automatización del hogar',
    price: 18.0,
    stock: 120,
    categories: ['Seguridad', 'Automatización'],
  },
  {
    name: 'Hub domótico Zigbee',
    description: 'Concentrador para dispositivos Zigbee',
    price: 45.0,
    stock: 55,
    categories: ['Domótica', 'Automatización'],
  },
  {
    name: 'Taladro inalámbrico 18V',
    description: 'Taladro a batería con maletín',
    price: 95.0,
    stock: 35,
    categories: ['Herramientas'],
  },
  {
    name: 'Cable de red Cat6 305m',
    description: 'Bobina de cable ethernet Cat6',
    price: 38.0,
    stock: 25,
    categories: ['Redes', 'Accesorios'],
  },
  {
    name: 'Proyector 4K',
    description: 'Proyector UHD con HDR10',
    price: 480.0,
    stock: 15,
    categories: ['Audio & Video'],
  },
  {
    name: 'Batería litio 100Ah',
    description: 'Batería de ciclo profundo para sistemas solares',
    price: 360.0,
    stock: 20,
    categories: ['Energía Solar'],
  },
  {
    name: 'Switch PoE 8 puertos',
    description: 'Switch gestionable con PoE+ 802.3at',
    price: 145.0,
    stock: 30,
    categories: ['Redes', 'Seguridad'],
  },
  {
    name: 'Persiana motorizada',
    description: 'Sistema de persiana con motor radio',
    price: 185.0,
    stock: 25,
    categories: ['Automatización', 'Domótica'],
  },
  {
    name: 'Foco inteligente E27',
    description: 'Bombilla WiFi regulable 10W',
    price: 12.0,
    stock: 300,
    categories: ['Iluminación', 'Domótica'],
  },
  {
    name: 'Controlador de carga MPPT',
    description: 'Controlador 40A para paneles solares',
    price: 110.0,
    stock: 40,
    categories: ['Energía Solar'],
  },
  {
    name: 'Enchufe inteligente',
    description: 'Enchufe WiFi con medición de consumo',
    price: 16.0,
    stock: 200,
    categories: ['Domótica', 'Automatización'],
  },
  {
    name: 'Detector de humo WiFi',
    description: 'Alarma de humo con notificación push',
    price: 32.0,
    stock: 90,
    categories: ['Seguridad'],
  },
  {
    name: 'Aire acondicionado 12000 BTU',
    description: 'Split inverter con bomba de calor',
    price: 620.0,
    stock: 12,
    categories: ['Climatización'],
  },
  {
    name: 'Cerradura electrónica',
    description: 'Cerradura con teclado, RFID y WiFi',
    price: 138.0,
    stock: 45,
    categories: ['Seguridad', 'Domótica'],
  },
  {
    name: 'Multímetro digital',
    description: 'Multímetro TRMS con registro',
    price: 55.0,
    stock: 60,
    categories: ['Herramientas'],
  },
  {
    name: 'Conector MC4 10 pares',
    description: 'Conectores para paneles solares',
    price: 9.0,
    stock: 500,
    categories: ['Energía Solar', 'Accesorios'],
  },
  {
    name: 'Amplificador de señal WiFi',
    description: 'Repetidor WiFi 5 GHz Mesh',
    price: 42.0,
    stock: 75,
    categories: ['Redes'],
  },
  {
    name: 'Regleta inteligente 6 tomas',
    description: 'Regleta con medición individual por toma',
    price: 48.0,
    stock: 85,
    categories: ['Domótica', 'Accesorios'],
  },
  {
    name: 'Proyector corta distancia',
    description: 'Proyector UST 4K Android TV',
    price: 950.0,
    stock: 8,
    categories: ['Audio & Video'],
  },
  {
    name: 'Ventilador de techo WiFi',
    description: 'Ventilador DC con mando y app',
    price: 145.0,
    stock: 30,
    categories: ['Climatización', 'Domótica'],
  },
  {
    name: 'Cable rígido 1.5mm² 100m',
    description: 'Cable unipolar THHN 1.5mm² negro',
    price: 22.0,
    stock: 80,
    categories: ['Accesorios'],
  },
  {
    name: 'Caja de distribución 12DIN',
    description: 'Tablero modular con tapa transparente',
    price: 28.0,
    stock: 55,
    categories: ['Herramientas', 'Accesorios'],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@qisur.com' },
    update: {},
    create: { email: 'admin@qisur.com', password: passwordHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'client@qisur.com' },
    update: {},
    create: {
      email: 'client@qisur.com',
      password: passwordHash,
      role: 'CLIENT',
    },
  });
  await prisma.user.upsert({
    where: { email: 'viewer@qisur.com' },
    update: {},
    create: {
      email: 'viewer@qisur.com',
      password: passwordHash,
      role: 'VIEWER',
    },
  });

  const categoryMap: Record<string, number> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `Productos de la categoría ${name}` },
    });
    categoryMap[name] = cat.id;
  }

  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        categories: {
          create: p.categories.map((c) => ({ categoryId: categoryMap[c] })),
        },
      },
    });

    const historyCount = 2 + Math.floor(Math.random() * 2);
    for (let i = historyCount; i >= 1; i--) {
      const factor = 1 - i * 0.05;
      await prisma.productHistory.create({
        data: {
          productId: product.id,
          price: parseFloat((p.price * factor).toFixed(2)),
          stock: Math.max(0, p.stock - i * 10),
          changedAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
