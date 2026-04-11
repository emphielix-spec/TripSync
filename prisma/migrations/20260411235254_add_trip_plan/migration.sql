-- CreateTable
CREATE TABLE "TripPlan" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
