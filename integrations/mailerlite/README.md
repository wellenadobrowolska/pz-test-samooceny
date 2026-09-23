# MailerLite — test samooceny

`POST /api/leads` dodaje lub aktualizuje adres e-mail w jednej wskazanej grupie
MailerLite. Po potwierdzeniu przez API test pokazuje wynik na stronie. Wynik
ani odpowiedzi nie są wysyłane e-mailem ani przekazywane do MailerLite.

## Konfiguracja

1. W MailerLite utwórz grupę, np. `Test samooceny — Pracownia Życia`, i skopiuj
   jej numeryczne ID z ustawień grupy lub adresu strony grupy.
2. W MailerLite przejdź do **Integrations → MailerLite API → Generate new token**.
   Nazwij klucz, np. `Test samooceny — produkcja`, i skopiuj go od razu.
3. W ustawieniach projektu na Vercel otwórz **Settings → Environment Variables**
   i dodaj dla środowiska **Production**:

   | Nazwa | Wartość |
   | --- | --- |
   | `MAILERLITE_API_KEY` | Klucz API z MailerLite |
   | `MAILERLITE_GROUP_ID` | Numeryczne ID grupy |

   Nie dodawaj prefiksu `NEXT_PUBLIC_` i nie zapisuj prawdziwego klucza w Git,
   pliku `.env.example`, zgłoszeniu ani rozmowie. Dla Preview i Development
   skonfiguruj osobną testową grupę i klucz albo pozostaw integrację wyłączoną.
4. Opublikuj zmiany projektu i wykonaj nowe wdrożenie po dodaniu zmiennych.
   Wdrożenie uruchomione przed zapisaniem zmiennych nie odczyta ich samo.
5. Przed udostępnieniem formularza wykonaj zapis własnym adresem i sprawdź,
   czy kontakt trafia do właściwej grupy oraz czy ekran wyniku pojawia się po
   potwierdzeniu zapisu. Usuń testowy kontakt po sprawdzeniu.

## Dane i zachowanie

- Do API MailerLite trafiają wyłącznie e-mail i ID wybranej grupy. Odpowiedzi,
  wynik, IP, identyfikator zgłoszenia i dane przeglądarki nie są wysyłane.
- Wymagane są zgoda marketingowa i poprawny e-mail. Żądania cross-site,
  niepoprawne dane i wypełnione pole honeypot są odrzucane przed połączeniem.
- Endpoint używa operacji create/upsert MailerLite; ponowienie dla tego samego
  adresu aktualizuje ten sam kontakt zamiast tworzyć duplikat.
- Kod nie ustawia statusu kontaktu ani nie wymusza ponownej subskrypcji osoby,
  która wcześniej się wypisała. Ustawienia potwierdzania zapisu i automatyzacje
  grupy skonfiguruj zgodnie z procesem zgód używanym na koncie MailerLite.
- Przy błędzie API formularz nie potwierdza zapisu i pozwala spróbować ponownie.
  Limit MailerLite jest zwracany jako możliwość ponowienia za kilka minut.
- Stara integracja z Google Sheets nie jest wywoływana przez aktualny endpoint.
  Wcześniejsze dane z arkusza pozostają osobno i podlegają dotychczasowym
  zasadom przechowywania; ta zmiana ich nie migruje ani nie usuwa.

## Konfiguracja lokalna

Skopiuj nazwy zmiennych z `.env.example` do lokalnego `.env.local`, używając
testowego klucza i testowej grupy. Nie zapisuj pliku `.env.local` w repozytorium.
