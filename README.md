# PŻ Test samooceny

Publiczny, bezpłatny test samooceny Pracowni Życia prowadzący do 30-dniowego programu Wellena.

## Status

Aplikacja zawiera:

- responsywny ekran startowy i 10 pytań;
- automatyczne przechodzenie między pytaniami i zapamiętywanie postępu przez 24 godziny;
- formularz adresu e-mail oraz ekran wyniku ze wskaźnikiem kołowym;
- treść edukacyjną, ćwiczenie i przejście do 30-dniowego programu Wellena;
- testy mechaniki punktacji.

Przygotowano tymczasowy zapis kontaktów w prywatnym Arkuszu Google przez
serwerowy `POST /api/leads` i Google Apps Script. Ekran wyniku jest odsłaniany
dopiero po potwierdzonym zapisie; nie wysyłamy jeszcze wyniku uczestniczce
e-mailem. Opcjonalne powiadomienia dla właścicielki nie są kopią wyniku.

**Integracja nie jest aktywna bez konfiguracji Google i Vercela.** Nie wdrażaj
nowego formularza publicznie przed wykonaniem instrukcji i testu odbiorowego.
Brak konfiguracji lub błąd zapisu daje czytelny komunikat zamiast pozornego
sukcesu. Zobacz [instrukcję uruchomienia](integrations/google-sheets/README.md).

Zapis obejmuje e-mail, datę, zgodę i jej wersję. Odpowiedzi, wynik, IP i dane
analityczne nie trafiają do arkusza. Sekret i adres skryptu są wyłącznie w
serwerowych zmiennych środowiskowych. Arkusz nie może być publicznie udostępniony.

Integracja z docelowym systemem mailingowym i analityka pozostają do wdrożenia.

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

- [`integrations/google-sheets/README.md`](integrations/google-sheets/README.md) — konfiguracja tymczasowego zapisu i test odbiorowy;
- [`integrations/google-sheets/Code.gs`](integrations/google-sheets/Code.gs) — gotowy skrypt do Google Apps Script;
- [`.env.example`](.env.example) — nazwy dwóch serwerowych ustawień Vercela (bez sekretów);
- [`SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md`](./SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md) — przebieg, architektura i kryteria odbioru;
- [`TEST_SAMOOCENY_MECHANIKA_v1.md`](./TEST_SAMOOCENY_MECHANIKA_v1.md) — pytania i źródło prawdy dla punktacji;
- [`TEST SAMOOCENY PŻ.txt`](./TEST%20SAMOOCENY%20PŻ.txt) — robocza treść landingu;
- [`TEKST_EKRAN_STARTOWY_v1.md`](./TEKST_EKRAN_STARTOWY_v1.md) — rekomendowany tekst pierwszego ekranu i pytania 1;
- [`WYNIK TESTU.txt`](./WYNIK%20TESTU.txt) — robocza treść wyniku;
- [`Kontekst/`](./Kontekst/) — strategia oraz zasady marki i języka.
