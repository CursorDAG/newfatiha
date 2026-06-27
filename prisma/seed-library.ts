import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLibrary() {
  console.log('🌱 Seeding library...');

  // Категории
  const categories = await Promise.all([
    prisma.libraryCategory.upsert({
      where: { slug: 'quran' },
      update: {},
      create: {
        name: 'Коран',
        slug: 'quran',
        description: 'Священный Коран с переводами и толкованиями',
        icon: 'BookOpen',
        order: 1,
      },
    }),
    prisma.libraryCategory.upsert({
      where: { slug: 'hadith' },
      update: {},
      create: {
        name: 'Хадисы',
        slug: 'hadith',
        description: 'Сборники хадисов Пророка ﷺ',
        icon: 'BookMarked',
        order: 2,
      },
    }),
    prisma.libraryCategory.upsert({
      where: { slug: 'aqeedah' },
      update: {},
      create: {
        name: 'Акыда',
        slug: 'aqeedah',
        description: 'Книги по вероубеждению',
        icon: 'Star',
        order: 3,
      },
    }),
    prisma.libraryCategory.upsert({
      where: { slug: 'fiqh' },
      update: {},
      create: {
        name: 'Фикх',
        slug: 'fiqh',
        description: 'Исламская юриспруденция',
        icon: 'Scale',
        order: 4,
      },
    }),
    prisma.libraryCategory.upsert({
      where: { slug: 'arabic' },
      update: {},
      create: {
        name: 'Арабский язык',
        slug: 'arabic',
        description: 'Учебники и пособия по арабскому языку',
        icon: 'Languages',
        order: 5,
      },
    }),
  ]);

  console.log('✓ Категории созданы');

  // Коран
  const quran = await prisma.book.upsert({
    where: { id: 'quran-arabic' },
    update: {},
    create: {
      id: 'quran-arabic',
      title: 'Священный Коран',
      titleArabic: 'القرآن الكريم',
      author: 'Откровение Аллаха',
      description: 'Полный текст Священного Корана на арабском языке с возможностью чтения переводов',
      categoryId: categories[0].id,
      language: 'ar',
      sourceType: 'API',
      sourceUrl: 'https://api.quran.com',
      isOpenSource: true,
      license: 'Public Domain',
      allowSelfStudy: true,
    },
  });

  console.log('✓ Коран добавлен');

  // Сахих аль-Бухари
  const bukhari = await prisma.book.upsert({
    where: { id: 'sahih-bukhari' },
    update: {},
    create: {
      id: 'sahih-bukhari',
      title: 'Сахих аль-Бухари',
      titleArabic: 'صحيح البخاري',
      author: 'Имам аль-Бухари',
      description: 'Самый достоверный сборник хадисов после Корана',
      categoryId: categories[1].id,
      language: 'ar',
      sourceType: 'API',
      sourceUrl: 'https://sunnah.com/bukhari',
      isOpenSource: true,
      license: 'CC BY-SA',
      allowSelfStudy: true,
    },
  });

  console.log('✓ Сахих аль-Бухари добавлен');

  // Муалим Сани
  const mualimSani = await prisma.book.upsert({
    where: { id: 'mualim-sani' },
    update: {},
    create: {
      id: 'mualim-sani',
      title: 'Муалим Сани',
      titleArabic: 'المعلم الثاني',
      author: 'Хасан Хильми Эфенди',
      description: 'Классический учебник по основам Ислама. Охватывает акыду, фикх и основы поклонения',
      categoryId: categories[2].id,
      language: 'ru',
      sourceType: 'PDF',
      isOpenSource: true,
      license: 'Public Domain',
      allowSelfStudy: true,
    },
  });

  // Самообучающийся курс по Муалим Сани
  await prisma.selfStudyCourse.upsert({
    where: { bookId: mualimSani.id },
    update: {},
    create: {
      bookId: mualimSani.id,
      title: 'Основы Ислама: Самостоятельное изучение',
      description: 'Бесплатный курс на основе Муалим Сани. Изучайте в своём темпе без учителя',
      lessonsStructure: {
        lessons: [
          { chapter: 1, title: 'Введение. Что такое Ислам', duration: 30 },
          { chapter: 2, title: 'Акыда: Шесть столпов веры', duration: 45 },
          { chapter: 3, title: 'Пять столпов Ислама', duration: 60 },
        ],
      },
      isActive: true,
    },
  });

  console.log('✓ Муалим Сани и самообучающийся курс добавлены');

  // Madinah Arabic
  const madinahArabic = await prisma.book.upsert({
    where: { id: 'madinah-arabic-1' },
    update: {},
    create: {
      id: 'madinah-arabic-1',
      title: 'Мединский курс арабского языка. Том 1',
      titleArabic: 'دروس اللغة العربية لغير الناطقين بها',
      author: 'Д-р В. Абдур-Рахим',
      description: 'Популярный учебник арабского языка для начинающих',
      categoryId: categories[4].id,
      language: 'ar',
      sourceType: 'PDF',
      sourceUrl: 'https://abdurrahman.org/arabic-learning/madinah-arabic.html',
      isOpenSource: true,
      license: 'CC BY-NC-SA',
      allowSelfStudy: true,
    },
  });

  console.log('✓ Mединский курс добавлен');

  console.log('✅ Library seed completed!');
}

seedLibrary()
  .catch((e) => {
    console.error('❌ Library seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
