import { Poppins, DM_Sans } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "TripSync",
  description: "Plan your group trip, together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${dmSans.variable}`}>
      {/* Inline script prevents dark-mode flash before React hydrates */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('ts_theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
