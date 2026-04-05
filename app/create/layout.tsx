import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a group – TripSync",
  description: "Start a new trip group and invite your friends with a shareable code.",
  openGraph: {
    title: "Create a group – TripSync",
    description: "Start a new trip group and invite your friends with a shareable code.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
