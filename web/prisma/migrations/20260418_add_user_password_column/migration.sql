-- Add optional password hash for credential-based auth
ALTER TABLE "User"
ADD COLUMN "password" TEXT;
