import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a group – TripSync",
  description: "Enter your invite code to join a group trip and add your travel preferences.",
  openGraph: {
    title: "Join a group – TripSync",
    description: "Enter your invite code to join a group trip.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
