import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started – TripSync",
  description: "Create a new group trip or join one your friend already created.",
  openGraph: {
    title: "Get started – TripSync",
    description: "Create a new group trip or join one your friend already created.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
