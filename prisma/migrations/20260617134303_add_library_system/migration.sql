-- CreateEnum
CREATE TYPE "BookSourceType" AS ENUM ('API', 'PDF', 'TEXT');

-- CreateEnum
CREATE TYPE "BookTranslationType" AS ENUM ('TRANSLATION', 'TAFSIR', 'COMMENTARY');

-- CreateTable
CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleArabic" TEXT,
    "author" TEXT,
    "authorArabic" TEXT,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "coverImage" TEXT,
    "sourceType" "BookSourceType" NOT NULL DEFAULT 'TEXT',
    "sourceUrl" TEXT,
    "isOpenSource" BOOLEAN NOT NULL DEFAULT true,
    "license" TEXT,
    "allowSelfStudy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleArabic" TEXT,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookTranslation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "language" TEXT NOT NULL,
    "translatorName" TEXT,
    "content" JSONB NOT NULL,
    "type" "BookTranslationType" NOT NULL DEFAULT 'TRANSLATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBook" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfStudyCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "lessonsStructure" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfStudyCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBookProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "lastChapterId" TEXT,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedChapters" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_slug_key" ON "LibraryCategory"("slug");

-- CreateIndex
CREATE INDEX "LibraryCategory_slug_idx" ON "LibraryCategory"("slug");

-- CreateIndex
CREATE INDEX "LibraryCategory_parentId_idx" ON "LibraryCategory"("parentId");

-- CreateIndex
CREATE INDEX "LibraryCategory_order_idx" ON "LibraryCategory"("order");

-- CreateIndex
CREATE INDEX "Book_categoryId_idx" ON "Book"("categoryId");

-- CreateIndex
CREATE INDEX "Book_language_idx" ON "Book"("language");

-- CreateIndex
CREATE INDEX "Book_allowSelfStudy_idx" ON "Book"("allowSelfStudy");

-- CreateIndex
CREATE INDEX "BookChapter_bookId_order_idx" ON "BookChapter"("bookId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BookChapter_bookId_number_key" ON "BookChapter"("bookId", "number");

-- CreateIndex
CREATE INDEX "BookTranslation_bookId_language_idx" ON "BookTranslation"("bookId", "language");

-- CreateIndex
CREATE INDEX "BookTranslation_chapterId_idx" ON "BookTranslation"("chapterId");

-- CreateIndex
CREATE INDEX "CourseBook_courseId_order_idx" ON "CourseBook"("courseId", "order");

-- CreateIndex
CREATE INDEX "CourseBook_bookId_idx" ON "CourseBook"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBook_courseId_bookId_key" ON "CourseBook"("courseId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "SelfStudyCourse_bookId_key" ON "SelfStudyCourse"("bookId");

-- CreateIndex
CREATE INDEX "SelfStudyCourse_isActive_idx" ON "SelfStudyCourse"("isActive");

-- CreateIndex
CREATE INDEX "UserBookProgress_userId_idx" ON "UserBookProgress"("userId");

-- CreateIndex
CREATE INDEX "UserBookProgress_bookId_idx" ON "UserBookProgress"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBookProgress_userId_bookId_key" ON "UserBookProgress"("userId", "bookId");

-- AddForeignKey
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LibraryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookChapter" ADD CONSTRAINT "BookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookTranslation" ADD CONSTRAINT "BookTranslation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookTranslation" ADD CONSTRAINT "BookTranslation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBook" ADD CONSTRAINT "CourseBook_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBook" ADD CONSTRAINT "CourseBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBook" ADD CONSTRAINT "CourseBook_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfStudyCourse" ADD CONSTRAINT "SelfStudyCourse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookProgress" ADD CONSTRAINT "UserBookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookProgress" ADD CONSTRAINT "UserBookProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
