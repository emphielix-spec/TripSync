-- AlterTable: remove travelMonth, add 10 boolean yes/no question fields
ALTER TABLE "Preference" DROP COLUMN IF EXISTS "travelMonth";

ALTER TABLE "Preference"
  ADD COLUMN IF NOT EXISTS "wantsBeach"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsNightlife"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "okLongFlights"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsOutdoor"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "prefersCity"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "budgetPriority"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsRoadTrip"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsWarmWeather"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "openToOffbeat"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wantsAllInclusive" BOOLEAN NOT NULL DEFAULT false;
