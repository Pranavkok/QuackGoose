-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductivityType" AS ENUM ('DEVELOPER', 'DESIGNER', 'WRITER', 'STUDENT', 'MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "DistractionLimitMode" AS ENUM ('TIME_BASED', 'GOAL_BASED');

-- CreateEnum
CREATE TYPE "EnforcementLevel" AS ENUM ('WARN_ONLY', 'BLUR', 'BLOCK', 'SHAME_AND_BLOCK');

-- CreateEnum
CREATE TYPE "SiteCategory" AS ENUM ('PRODUCTIVE', 'DISTRACTION', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "SiteSubcategory" AS ENUM ('CODING', 'DOCUMENTATION', 'RESEARCH', 'WRITING', 'DESIGN', 'LEARNING', 'SOCIAL_MEDIA', 'VIDEO_ENTERTAINMENT', 'NEWS', 'SHOPPING', 'GAMING', 'COMMUNICATION', 'PRODUCTIVITY_TOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "DuckMood" AS ENUM ('HAPPY', 'IDLE', 'SLEEPY', 'WATCHING', 'WARNING', 'ANGRY', 'CHAOS', 'PROUD', 'DISAPPOINTED');

-- CreateEnum
CREATE TYPE "PlantType" AS ENUM ('SMALL_FLOWER', 'MEDIUM_FLOWER', 'SMALL_TREE', 'LARGE_TREE', 'GOLDEN_PLANT');

-- CreateEnum
CREATE TYPE "PlantStatus" AS ENUM ('ALIVE', 'DEAD');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productivityType" "ProductivityType" NOT NULL DEFAULT 'OTHER',
    "distractionTypes" TEXT[],
    "strictnessLevel" INTEGER NOT NULL DEFAULT 3,
    "dailyFocusGoalMinutes" INTEGER NOT NULL DEFAULT 240,
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '18:00',
    "distractionLimitMode" "DistractionLimitMode" NOT NULL DEFAULT 'TIME_BASED',
    "distractionLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "alwaysBlockedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alwaysProductiveDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enforcementLevel" "EnforcementLevel" NOT NULL DEFAULT 'BLUR',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "distractionLimitMode" "DistractionLimitMode" NOT NULL DEFAULT 'TIME_BASED',
    "distractionLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "dailyFocusGoalMinutes" INTEGER NOT NULL DEFAULT 240,
    "enforcementLevel" "EnforcementLevel" NOT NULL DEFAULT 'BLUR',
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '18:00',
    "duckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "duckMessagesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "pageTitle" TEXT,
    "category" "SiteCategory" NOT NULL DEFAULT 'NEUTRAL',
    "subcategory" "SiteSubcategory" NOT NULL DEFAULT 'OTHER',
    "isProductive" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalFocusMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalDistractionMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalNeutralMinutes" INTEGER NOT NULL DEFAULT 0,
    "distractionLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "limitReached" BOOLEAN NOT NULL DEFAULT false,
    "productiveDayComplete" BOOLEAN NOT NULL DEFAULT false,
    "productivityScore" INTEGER NOT NULL DEFAULT 0,
    "plantsGrown" INTEGER NOT NULL DEFAULT 0,
    "plantsLost" INTEGER NOT NULL DEFAULT 0,
    "focusStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteClassification" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" "SiteCategory" NOT NULL DEFAULT 'NEUTRAL',
    "subcategory" "SiteSubcategory" NOT NULL DEFAULT 'OTHER',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "aiClassified" BOOLEAN NOT NULL DEFAULT false,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWebsiteOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" "SiteCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWebsiteOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPlants" INTEGER NOT NULL DEFAULT 0,
    "alivePlants" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GardenPlant" (
    "id" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "plantType" "PlantType" NOT NULL,
    "status" "PlantStatus" NOT NULL DEFAULT 'ALIVE',
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "spawnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diedAt" TIMESTAMP(3),
    "sourceDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GardenPlant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProfile_userId_key" ON "OnboardingProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_date_idx" ON "ActivityLog"("userId", "date");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_domain_idx" ON "ActivityLog"("userId", "domain");

-- CreateIndex
CREATE INDEX "ActivityLog_date_idx" ON "ActivityLog"("date");

-- CreateIndex
CREATE INDEX "DailySummary_userId_date_idx" ON "DailySummary"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_userId_date_key" ON "DailySummary"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteClassification_domain_key" ON "WebsiteClassification"("domain");

-- CreateIndex
CREATE INDEX "WebsiteClassification_domain_idx" ON "WebsiteClassification"("domain");

-- CreateIndex
CREATE INDEX "WebsiteClassification_expiresAt_idx" ON "WebsiteClassification"("expiresAt");

-- CreateIndex
CREATE INDEX "UserWebsiteOverride_userId_idx" ON "UserWebsiteOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWebsiteOverride_userId_domain_key" ON "UserWebsiteOverride"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "Garden_userId_key" ON "Garden"("userId");

-- CreateIndex
CREATE INDEX "GardenPlant_gardenId_status_idx" ON "GardenPlant"("gardenId", "status");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWebsiteOverride" ADD CONSTRAINT "UserWebsiteOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Garden" ADD CONSTRAINT "Garden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenPlant" ADD CONSTRAINT "GardenPlant_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

