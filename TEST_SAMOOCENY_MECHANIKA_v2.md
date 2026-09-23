# Test samooceny — specyfikacja mechaniki (v2)

> **Cel dokumentu:** kompletny, samowystarczalny opis mechaniki testu samooceny, wystarczający do zbudowania go na dowolnej stronie/domenie, niezależnie od aplikacji Wellena. Zawiera wyłącznie **mechanikę**: treść pozycji, skalę, reguły liczenia, walidację, przypadki brzegowe i zasady prezentacji wyniku na poziomie treści.
>
> **Poza zakresem:** wygląd, układ ekranów, kolory, animacje, dostępność wizualna (UX jest w `SPECYFIKACJA_TEST_SAMOOCENY_v2.md`, sekcje 5.2a/5.2b — dotyczy aplikacji Wellena). Poza zakresem także: kod, zbieranie e-maili, integracje mailingowe.
>
> **Źródło prawdy dla treści pozycji i punktacji.** Jeśli ten dokument i jakikolwiek inny materiał się różnią — obowiązuje ten. Zmiana treści pozycji lub punktacji unieważnia porównywalność wyników między wersjami (patrz sekcja 8).

> **Zmiany w v2:** zmieniono treść pozycji 2 i 6. Obie pozostają pozycjami odwróconymi, więc reguła punktacji jest taka sama jak w v1. Wyników v1 i v2 nie należy traktować jako bezpośrednio porównywalnych.

---

## 1. Czym jest ten test

| Kwestia | Ustalenie |
|---|---|
| Nazwa dla użytkowniczki | **Test samooceny** |
| Obszar refleksji | Samoocena, rozpamiętywanie niepowodzeń i zaufanie do realizacji celów; to nie jest zwalidowana, jednowymiarowa miara tych obszarów |
| Podstawa | Autorskie pozycje do autorefleksji. Część jest luźno inspirowana tematyką oryginalnej skali Rosenberga (RSES, 1965 — domena publiczna); wersja v2 nie jest jej wierną parafrazą ani adaptacją |
| Charakter | **Wskaźnik pomocniczy — nie narzędzie kliniczne, nie diagnoza** |
| Zakres wyniku | 10–40 punktów, wyższy = wyższa samoocena |
| Interpretacja | **Brak norm, progów i etykiet.** Wynik może służyć jako punkt odniesienia tej samej osoby przy użyciu tej samej wersji testu; v1 i v2 nie są bezpośrednio porównywalne |
| Nazwa „skala Rosenberga" | **Nie używać wobec użytkowniczek** (niepotrzebny sygnał kliniczny). W dokumentacji wewnętrznej — tak |

---

## 2. Pozycje testu (10) — treść finalna

Kolejność pozycji jest **stała** i identyczna przy każdym wypełnieniu (warunek porównywalności pomiarów). **Nie losować kolejności.**

Forma żeńska jest domyślna; wariant męski w nawiasie. Jeśli budowana wersja nie zna płci użytkowniczki — zostawić oba warianty dokładnie tak, jak zapisano poniżej (z nawiasem).

| Nr | Treść pozycji | Typ |
|---|---|---|
| 1 | Jest mi dobrze z tym, jaka (jaki) jestem. | `+` |
| 2 | Każde niepowodzenie odtwarzam w głowie wiele razy. | `−` |
| 3 | Dostrzegam w sobie sporo zalet. | `+` |
| 4 | To, co robię, wychodzi mi nie gorzej niż innym. | `+` |
| 5 | Trudno mi wskazać coś, czym mogłabym (mógłbym) się naprawdę pochwalić. | `−` |
| 6 | Kiedy myślę o swoich marzeniach i celach, wątpię, czy dam radę je zrealizować. | `−` |
| 7 | Czuję, że jestem tyle samo warta (wart), co każdy inny człowiek. | `+` |
| 8 | Żałuję, że nie traktuję samej (samego) siebie z większym szacunkiem. | `−` |
| 9 | W głębi duszy często czuję się osobą przegraną. | `−` |
| 10 | Myślę o sobie raczej dobrze niż źle. | `+` |

**Typ pozycji:**
- `+` — **pozycja wprost** (zgoda oznacza wyższą samoocenę): numery **1, 3, 4, 7, 10**
- `−` — **pozycja odwrócona** (zgoda oznacza niższą samoocenę): numery **2, 5, 6, 8, 9**

Pozycji odwróconych jest dokładnie 5 — jak w oryginalnej skali Rosenberga. Typ pozycji **nie jest widoczny dla użytkowniczki** (żadnych oznaczeń, kolorów ani grupowania wg typu).

---

## 3. Skala odpowiedzi

Cztery stopnie, **bez odpowiedzi neutralnej** (wymusza kierunek — jak w oryginale). Użytkowniczka widzi wyłącznie etykiety tekstowe; wartość liczbowa `o` jest wewnętrzna i nigdzie nie jest pokazywana.

| Etykieta widoczna dla użytkowniczki | Wartość wewnętrzna `o` |
|---|---|
| Zdecydowanie się nie zgadzam | 1 |
| Raczej się nie zgadzam | 2 |
| Raczej się zgadzam | 3 |
| Zdecydowanie się zgadzam | 4 |

Skala jest **identyczna dla wszystkich 10 pozycji** — ta sama kolejność etykiet, te same wartości. Nie odwracać kolejności etykiet przy pozycjach odwróconych (odwrócenie dzieje się wyłącznie w liczeniu, nie w prezentacji).

---

## 4. Reguły liczenia wyniku

### 4.1 Punkty za pojedynczą pozycję

**Pozycja wprost `+` (nr 1, 3, 4, 7, 10):**

```
punkty = o
```
czyli: 1→1, 2→2, 3→3, 4→4

**Pozycja odwrócona `−` (nr 2, 5, 6, 8, 9):**

```
punkty = 5 − o
```
czyli: 1→4, 2→3, 3→2, 4→1

**Przykład różnicy:** odpowiedź „Zdecydowanie się zgadzam" (`o = 4`) przy pozycji 3 („Dostrzegam w sobie sporo zalet") daje **4 punkty**; ta sama odpowiedź przy pozycji 9 („W głębi duszy często czuję się osobą przegraną") daje **1 punkt**.

### 4.2 Wynik łączny

```
wynik = suma punktów z 10 pozycji
```

Zakres: **10 (minimum) – 40 (maksimum)**. Wyższy wynik = wyższa samoocena.

### 4.3 Wymagania implementacyjne

- Liczenie musi być **deterministyczne** — czysta funkcja: te same odpowiedzi zawsze dają ten sam wynik. Żadnego udziału modelu AI, losowości, wag ani zaokrągleń.
- Liczenie musi być **jednym modułem współdzielonym** przez wszystkie wersje testu (aplikacja, strona publiczna, dowolna kolejna). Jedno źródło prawdy dla punktacji — inaczej wyniki z różnych wersji przestają być porównywalne.
- Nie wyliczać ani nie przechowywać żadnych podskal, średnich, procentów ani przeliczeń na inne skale.

### 4.4 Wektory testowe (do weryfikacji implementacji)

Implementacja musi przechodzić wszystkie poniższe przypadki:

| # | Odpowiedzi `o` dla pozycji 1–10 | Oczekiwany wynik | Co sprawdza |
|---|---|---|---|
| T1 | 1, 4, 1, 1, 4, 4, 1, 4, 4, 1 | **10** | minimum |
| T2 | 4, 1, 4, 4, 1, 1, 4, 1, 1, 4 | **40** | maksimum |
| T3 | 3, 2, 3, 4, 1, 2, 4, 3, 1, 3 | **33** | przypadek mieszany |
| T4 | 4, 4, 4, 4, 4, 4, 4, 4, 4, 4 | **25** | sama zgoda (5×4 + 5×1) |
| T5 | 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 | **25** | sama niezgoda (5×1 + 5×4) |
| T6 | 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 | **25** | środek skali |

Rozpisanie T3: punkty = 3, (5−2)=3, 3, 4, (5−1)=4, (5−2)=3, 4, (5−3)=2, (5−1)=4, 3 → **33**.

T4 i T5 są ważne kontrolnie: jeśli implementacja daje przy nich 40 lub 10, odwracanie pozycji `−` nie działa.

---

## 5. Walidacja i przypadki brzegowe

1. **Wszystkie 10 pozycji obowiązkowych.** Wynik liczony wyłącznie przy komplecie odpowiedzi — brak liczenia częściowego, brak imputacji brakujących odpowiedzi.
2. **Brak odpowiedzi zaznaczonych na starcie.** Żadnej wartości domyślnej (domyślna odpowiedź zafałszowuje wynik).
3. **Dokładnie jedna odpowiedź na pozycję.** Zmiana wyboru możliwa do momentu zatwierdzenia.
4. **Zapis atomowy:** albo zapisany kompletny wynik, albo nic. Żadnego stanu „w połowie wypełniony" w bazie.
5. **Odpowiedzi cząstkowe trzymane po stronie przeglądarki** do momentu zatwierdzenia. Przy błędzie sieci podczas zapisu — odpowiedzi nie giną, możliwe ponowienie.
6. **Jeden pomiar = jedno wypełnienie.** Po zapisaniu wyniku ten sam pomiar jest niedostępny ponownie (bez „poprawiania"). W wersji publicznej/bez konta: decyzja własna, ale nie zachęcać do powtarzania w tej samej sesji.
7. **Wartości spoza zakresu 1–4** traktować jako błąd implementacji, nie jako brakującą odpowiedź.

---

## 6. Prezentacja wyniku — reguły treści

Dotyczy tego, **co wolno powiedzieć** o wyniku (nie tego, jak ma wyglądać).

**Wolno:**
- pokazać samą liczbę w formacie `{wynik} na 40`,
- dodać jedno spokojne zdanie kontekstu, np.: *„Sam wynik nie jest ani »dobry«, ani »zły« — to po prostu punkt, z którego zaczynasz."*,
- zapowiedzieć powtórny pomiar i porównanie w czasie.

**Nie wolno:**
- podawać norm, progów, przedziałów („wynik niski/średni/wysoki"),
- nadawać etykiet osobie ani stanom („masz niską samoocenę"),
- porównywać do innych osób, średnich, populacji, percentyli,
- sugerować diagnozy, zaburzenia ani potrzeby leczenia,
- prezentować wyniku w formie sugerującej ocenę (wskaźnik z podziałką, skala czerwień→zieleń, buźki, oceny szkolne).

**Interpretacja różnicy między pomiarami** (jeśli wersja przewiduje dwa pomiary): wyłącznie jako zmiana wewnątrzosobowa, opisowo, bez wnioskowania o przyczynach ani obiecywania trwałości.

---

## 7. Zastrzeżenia obowiązkowe

Każda wersja testu — także publiczna, także bez konta — musi zawierać, w widocznym miejscu przed wypełnieniem lub przy wyniku:

1. **Nie jest to test kliniczny ani diagnoza.**
2. Zachętę do odpowiadania zgodnie ze stanem faktycznym: *„Odpowiadaj tak, jak jest dziś, nie tak, jak »powinno być«."*
3. Czas wypełnienia: 2–3 minuty (10 zdań).
4. Informację, kto zobaczy wynik (przy wersji publicznej z e-mailem — także co się dzieje z adresem).

Jeśli wersja publiczna zbiera dane osobowe (e-mail): zgoda marketingowa jako osobny checkbox, link do polityki prywatności, zasada minimalizacji danych (rekomendacja: nie przechowywać wyniku razem z adresem, jeśli nie jest to konieczne). Szczegóły — poza zakresem tego dokumentu, do modułu prawnego.

---

## 8. Zasady zmian

- **Treść pozycji i reguły punktacji są zamrożone.** Każda zmiana (nawet jednego słowa w pozycji) tworzy nową wersję narzędzia i **unieważnia porównywalność** z wynikami zebranymi wcześniej.
- Zmiana wymaga: nowego numeru wersji tego dokumentu, wpisu co i dlaczego zmieniono, oraz decyzji, co zrobić z wynikami z wersji poprzedniej.
- Wersje testu na różnych domenach muszą korzystać z **tych samych pozycji, tej samej skali i tego samego modułu liczenia**. Rozjechanie się wersji jest najpoważniejszym ryzykiem tego narzędzia.

---

## 9. Podstawa metodologiczna i punkty czujności

- Oryginalna RSES (Rosenberg, 1965) jest w domenie publicznej; pozycje v2 są **autorskimi sformułowaniami do autorefleksji**, nie wierną parafrazą ani adaptacją RSES czy komercyjnej polskiej adaptacji SES (PTP). *(Ocena robocza, nie porada prawna.)*
- **Brak własnych właściwości psychometrycznych** — narzędzie nie było walidowane. Stąd zakaz norm i interpretacji: wynik jest wskaźnikiem zmiany, nie miarą absolutną.
- Wersja v2 zmienia zakres dwóch pozycji: poz. 2 dotyczy rozpamiętywania niepowodzeń, a poz. 6 zwątpienia w możliwość realizacji celów. Nie należy interpretować tych pozycji jako równoważnych wcześniejszym pytaniom o ogólną ocenę własnej wartości.
- Punkty do ewentualnego review psychologicznego (nie blokują użycia): poz. 2 (rozpamiętywanie), poz. 4 (rama wykonaniowa), poz. 5 („pochwalić się" obejmuje też osiągnięcia zewnętrzne), poz. 6 (zwątpienie w realizację celów), poz. 9 („w głębi duszy"), poz. 10 (porównanie dobrze/źle).

---

## 10. Lista kontrolna wdrożenia

- [ ] 10 pozycji w kolejności 1–10, treść dokładnie jak w sekcji 2 (kopiuj, nie przepisuj)
- [ ] Kolejność pozycji stała, bez losowania
- [ ] 4 etykiety odpowiedzi w kolejności z sekcji 3, identyczne przy każdej pozycji
- [ ] Brak odpowiedzi domyślnych
- [ ] Punktacja: pozycje 2, 5, 6, 8, 9 liczone jako `5 − o`; pozostałe jako `o`
- [ ] Wszystkie wektory testowe T1–T6 przechodzą
- [ ] Wynik liczony przez współdzielony moduł, nie skopiowany fragment kodu
- [ ] Wynik pokazywany jako `{wynik} na 40`, bez norm, progów i etykiet
- [ ] Zastrzeżenie „to nie jest diagnoza" widoczne
- [ ] Test nie da się zatwierdzić przy niekompletnych odpowiedziach
- [ ] Zapis atomowy; odpowiedzi nie giną przy błędzie sieci
