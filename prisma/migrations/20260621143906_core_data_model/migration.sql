-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "themeJson" JSONB NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "logoUrl" TEXT,
    "rewardsJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waitlistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "position" INTEGER NOT NULL,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signup_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "Waitlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signup_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Signup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_slug_key" ON "Waitlist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_referralCode_key" ON "Signup"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_waitlistId_email_key" ON "Signup"("waitlistId", "email");
