import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Baner zgody CookieYes — ten sam skrypt co na pracowniazycia.pl.
// Na koncie CookieYes włączone jest „Subdomain consent sharing”, więc zgoda
// wyrażona na stronie głównej obowiązuje też tutaj (i odwrotnie).
// Musi ładować się przed jakimkolwiek tagiem analitycznym.
const COOKIEYES_SRC =
  "https://cdn-cookieyes.com/client_data/79ab426273cae32469bd6c8f/script.js";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bezpłatny test samooceny | Pracownia Życia",
  description:
    "Dziesięć krótkich pytań, które pomogą Ci zobaczyć, jak wygląda Twoja relacja ze sobą.",
  icons: {
    icon: "/favicon-32.png",
    apple: "/favicon-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Script id="cookieyes" src={COOKIEYES_SRC} strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
