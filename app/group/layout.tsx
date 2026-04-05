import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your trip – TripSync",
  description: "Manage preferences, vote on destinations, and split costs with your group.",
  openGraph: {
    title: "Your trip – TripSync",
    description: "Manage preferences, vote on destinations, and split costs with your group.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
