-- AlterTable
ALTER TABLE "Task" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(subject, '') || ' ' || 
    coalesce(description, '') || ' ' || 
    coalesce("customerName", '') || ' ' ||
    coalesce("senderEmail", '') || ' ' ||
    coalesce("inquiryId", ''))
  ) STORED;

CREATE INDEX task_search_idx ON "Task" USING GIN (search_vector);

-- CreateTable
CREATE TABLE "NotificationArchive" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationArchive_userId_idx" ON "NotificationArchive"("userId");

-- AddForeignKey
ALTER TABLE "NotificationArchive" ADD CONSTRAINT "NotificationArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
