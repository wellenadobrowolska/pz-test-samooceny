# PŻ Test samooceny

Publiczny, bezpłatny test samooceny Pracowni Życia prowadzący do 30-dniowego programu Wellena.

## Status

Aplikacja zawiera:

- responsywny ekran startowy i 10 pytań;
- automatyczne przechodzenie między pytaniami i zapamiętywanie postępu przez 24 godziny;
- formularz adresu e-mail oraz ekran wyniku ze wskaźnikiem kołowym;
- treść edukacyjną, ćwiczenie i przejście do 30-dniowego programu Wellena;
- testy mechaniki punktacji.

Formularz przekazuje e-mail po zgodzie do serwerowego `POST /api/leads`, który
dodaje go do skonfigurowanej grupy MailerLite. Wynik pojawia się po potwierdzeniu
zapisu przez MailerLite. Test nie wysyła wyniku e-mailem ani nie przekazuje
odpowiedzi, punktacji, adresu IP czy danych analitycznych do MailerLite.

**Integracja wymaga ustawienia `MAILERLITE_API_KEY` i `MAILERLITE_GROUP_ID` w
Vercel.** Bez tych zmiennych formularz pokaże komunikat o niedostępnym zapisie.
Instrukcja znajduje się w
[`integrations/mailerlite/README.md`](integrations/mailerlite/README.md).
Poprzednie instrukcje integracji z Arkuszem Google pozostają w repozytorium do
obsługi wcześniejszych zapisów; aktualny endpoint nie zapisuje już do arkusza.

## Uruchomienie lokalne

```bash
pnpm install
pnpm dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

Kontrola jakości:

```bash
pnpm lint
pnpm test
pnpm build
node --test integrations/google-sheets/Code.test.mjs
```

## Zatwierdzony kierunek techniczny

- adres: `test-samooceny.pracowniazycia.pl`;
- aplikacja: Next.js + TypeScript;
- hosting: Vercel;
- repozytorium: GitHub;
- baza danych: bez Supabase w MVP;
- analityka: GA4/GTM z pomiarem przejścia do `wellena.pl`;
- wynik: `10–40`, z neutralnym wskaźnikiem kołowym;
- Wellena: 30-dniowy program Pracowni Życia.

## Dokumentacja

- [`integrations/mailerlite/README.md`](integrations/mailerlite/README.md) — konfiguracja MailerLite i test odbiorowy;
- [`integrations/google-sheets/README.md`](integrations/google-sheets/README.md) — wcześniejsza integracja arkusza, nieużywana przez aktualny endpoint;
- [`integrations/google-sheets/Code.gs`](integrations/google-sheets/Code.gs) — gotowy skrypt do Google Apps Script;
- [`.env.example`](.env.example) — nazwy serwerowych ustawień Vercela (bez sekretów);
- [`SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md`](./SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md) — przebieg, architektura i kryteria odbioru;
- [`TEST_SAMOOCENY_MECHANIKA_v2.md`](./TEST_SAMOOCENY_MECHANIKA_v2.md) — aktualne pytania i źródło prawdy dla punktacji;
- [`TEST_SAMOOCENY_MECHANIKA_v1.md`](./TEST_SAMOOCENY_MECHANIKA_v1.md) — archiwalna, wcześniejsza wersja pytań;
- [`TEST SAMOOCENY PŻ.txt`](./TEST%20SAMOOCENY%20PŻ.txt) — robocza treść landingu;
- [`TEKST_EKRAN_STARTOWY_v1.md`](./TEKST_EKRAN_STARTOWY_v1.md) — rekomendowany tekst pierwszego ekranu i pytania 1;
- [`WYNIK TESTU.txt`](./WYNIK%20TESTU.txt) — robocza treść wyniku;
- [`Kontekst/`](./Kontekst/) — strategia oraz zasady marki i języka.
