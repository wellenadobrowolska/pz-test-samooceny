import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { GTM_ID } from "@/lib/analytics";
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
        {/* Domyślny stan zgody Google: wszystko odmówione, dopóki CookieYes nie
            poda wyboru. Musi stać przed CookieYes i przed GTM. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});gtag('set','ads_data_redaction',true);`}
        </Script>
        <Script id="cookieyes" src={COOKIEYES_SRC} strategy="beforeInteractive" />
        {/* Kontener GTM wspólny ze stroną główną — po CookieYes. Tagi w nim
            uruchamiają się dopiero po sygnale zgody (cookie_consent_update).
            Tylko pod domeną pracowniazycia.pl: lokalne testy i podglądy Vercela
            nie wysyłają danych do GA4 ani Meta. */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){if(!/(^|\\.)pracowniazycia\\.pl$/.test(w.location.hostname))return;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
