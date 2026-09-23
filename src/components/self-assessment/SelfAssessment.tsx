"use client";

import Image from "next/image";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ANSWER_OPTIONS,
  QUESTIONS,
  TEST_VERSION,
} from "@/domain/self-esteem-v2/questions";
import {
  isAnswerValue,
  scoreAnswers,
  scoreProgress,
} from "@/domain/self-esteem-v2/score";
import {
  isValidEmail,
  MARKETING_CONSENT_INTRO,
  MARKETING_CONSENT_WITHDRAWAL,
  normalizeEmail,
  PRIVACY_POLICY_URL,
} from "@/domain/leads/contract";
import type { AnswerValue } from "@/domain/self-esteem-v2/types";
import { trackEvent } from "@/lib/analytics";
import {
  createSubmissionId,
  LeadSubmissionError,
  submitLead,
} from "@/lib/leads/submit-lead";
import {
  clearProgress,
  persistProgress,
  persistResult,
  restoreAssessment,
} from "./progress-storage";
import styles from "./SelfAssessment.module.css";

type Stage = "questions" | "email" | "result";

const emptyAnswers = (): Array<AnswerValue | null> =>
  Array.from({ length: QUESTIONS.length }, () => null);

function hasCompleteAnswers(
  answers: Array<AnswerValue | null>,
): answers is AnswerValue[] {
  return answers.length === QUESTIONS.length && answers.every(isAnswerValue);
}

function ResultGauge({ score }: { score: number }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const progress = scoreProgress(score);
  const arcLength = circumference * 0.75;
  const valueLength = Math.max(arcLength * progress, 0.001);

  return (
    <div
      className={styles.gauge}
      role="img"
      aria-label={`Twój wynik: ${score} na 40`}
    >
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle
          className={styles.gaugeTrack}
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={[arcLength, circumference - arcLength].join(" ")}
        />
        <circle
          className={styles.gaugeValue}
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={[valueLength, circumference - valueLength].join(" ")}
        />
      </svg>
      <div className={styles.gaugeLabel}>
        <strong>{score}</strong>
        <span>na 40</span>
      </div>
      <div className={styles.gaugeScale} aria-hidden="true">
        <span>10</span>
        <span>40</span>
      </div>
    </div>
  );
}

function trackWellenaClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  ctaLocation: string,
) {
  const link = event.currentTarget;
  trackEvent({
    event: "wellena_cta_click",
    ctaLocation,
    linkUrl: link.href,
    linkText: link.innerText || link.getAttribute("aria-label") || "",
  });
}

function ResultScreen({ score }: { score: number }) {
  return (
    <main className={styles.resultMain}>
      <section className={styles.resultHero} aria-labelledby="result-title">
        <div className={styles.resultHeroGrid}>
          <div className={styles.resultCopy}>
            <p className={styles.resultEyebrow}>
              Pracownia Życia · Test samooceny
            </p>
            <h1 id="result-title" tabIndex={-1}>
              Twój wynik to
              <span>{score} na 40 punktów</span>
            </h1>
            <p className={styles.resultIntro}>
              To zapis Twoich dzisiejszych odpowiedzi i punkt odniesienia do
              dalszej refleksji. Nie jest oceną Ciebie ani miarą Twojej wartości.
            </p>
          </div>

          <div className={styles.resultGaugePanel}>
            <ResultGauge score={score} />
            <p>Twój dzisiejszy wynik</p>
          </div>
        </div>

        <div className={styles.resultDisclaimer}>
          <span className={styles.resultInfoMark} aria-hidden="true">
            i
          </span>
          <p>
            Test nie jest narzędziem klinicznym ani diagnozą psychologiczną.
            Niezależnie od miejsca, z którego zaczynasz, możesz pracować nad
            relacją ze sobą.
          </p>
        </div>
      </section>

      <p className={styles.resultEmailNotice}>
        Wynik i ćwiczenie są dostępne na tej stronie. Na razie nie wysyłamy
        ich e-mailem.
      </p>

      <a
        className={styles.resultScrollCue}
        href="#bridge-title"
        aria-label="Przejdź do dalszej części wyniku"
      >
        <span>Czytaj dalej</span>
        <svg viewBox="0 0 24 28" aria-hidden="true">
          <path d="m5 6 7 7 7-7" />
          <path d="m5 14 7 7 7-7" />
        </svg>
      </a>

      <section
        className={styles.resultBridge}
        aria-labelledby="bridge-title"
      >
        <div className={styles.resultBridgeCopy}>
          <h2 id="bridge-title">
            Jaki krok chcesz zrobić, ale wciąż go odkładasz?
          </h2>
          <p>
            Rozmowę o awansie, wysłanie oferty, a może powiedzenie komuś o swoich
            potrzebach?
          </p>
          <p>
            Wellena to 30-dniowy program z osobistą przewodniczką AI – prywatnie,
            bez grupy. Przez rozmowy, ćwiczenia i małe działania pomaga zrozumieć,
            co Cię zatrzymuje, i budować zaufanie do siebie na tym, co już masz.
          </p>
        </div>
        <a
          className={[styles.primaryButton, styles.resultBridgeCta].join(" ")}
          href="https://wellena.pl"
          onClick={(event) => trackWellenaClick(event, "wynik-pytanie")}
        >
          Zobacz, jak działa Wellena
        </a>
      </section>

      <section
        className={styles.resultEducation}
        aria-labelledby="education-title"
      >
        <div className={styles.sectionHeading}>
          <h2 id="education-title">Co warto wiedzieć o relacji ze sobą</h2>
        </div>

        <div className={styles.educationGrid}>
          <article className={styles.educationCard}>
            <span className={styles.educationIcon} aria-hidden="true">
              ♡
            </span>
            <h3>Pewność siebie to nie to samo co poczucie własnej wartości</h3>
            <p>
              Pewność siebie mówi: „Poradzę sobie w tej sytuacji”. Poczucie
              własnej wartości mówi: „Nadal zasługuję na szacunek, nawet jeśli
              sobie nie poradzę”. Dlatego warto pracować nie tylko nad
              odważniejszym działaniem, lecz także nad tym, jak traktujesz siebie
              niezależnie od wyniku.
            </p>
          </article>

          <article className={styles.educationCard}>
            <span className={styles.educationIcon} aria-hidden="true">
              ✦
            </span>
            <h3>Poczucie własnej wartości nie jest ustalone raz na zawsze</h3>
            <p>
              Na sposób, w jaki dziś myślisz o sobie, wpłynęły doświadczenia,
              relacje i komunikaty otrzymywane od innych. Nie oznacza to jednak,
              że Twój stosunek do siebie został ustalony na zawsze. Jako dorosła
              osoba możesz rozwijać zaufanie do własnego myślenia i działania
              oraz traktować swoje potrzeby, granice i cele jako ważne.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.exerciseSection} aria-labelledby="exercise-title">
        <div className={styles.exerciseInner}>
          <div className={styles.exerciseHeader}>
            <div>
              <p className={styles.sectionEyebrow}>
                Ćwiczenie do wielokrotnego wykorzystania
              </p>
              <h2 id="exercise-title">Potrafię / Mogę</h2>
            </div>
            <p>
              Gdy stoisz przed nowym wyzwaniem, łatwo skupić się na ryzyku i
              własnych brakach. To ćwiczenie pomoże Ci przypomnieć sobie, na czym
              możesz się oprzeć.
            </p>
          </div>

          <ol className={styles.exerciseSteps}>
            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                1
              </span>
              <div>
                <h3>Wybierz jedno wydarzenie albo sytuację</h3>
                <p>
                  Przypomnij sobie sytuację, w której poradziłaś sobie z czymś
                  ważnym lub trudnym. Nie musi to być wielkie osiągnięcie — ważne,
                  że poczułaś wtedy swoją sprawczość.
                </p>
              </div>
            </li>

            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                2
              </span>
              <div>
                <h3>Przypomnij sobie</h3>
                <p>
                  Co wtedy zrobiłaś i co Ci pomogło? Nazwij jedną umiejętność,
                  decyzję albo cechę, na której się oparłaś.
                </p>
              </div>
            </li>

            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                3
              </span>
              <div>
                <h3>
                  Wróć do tego wspomnienia przed nowym wyzwaniem
                </h3>
                <p>
                  Nie po to, żeby przekonywać siebie, że na pewno się uda. Po to,
                  żeby obok obaw zobaczyć również fakty o tym, co już potrafisz i
                  z czego możesz skorzystać.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.wellenaSection} aria-labelledby="wellena-title">
        <div className={styles.wellenaInner}>
          <div className={styles.wellenaLead}>
            <div className={styles.wellenaVisual}>
              <Image
                src="/brand/kobieta-nad-dokumentami-przy-regalach.webp"
                alt="Kobieta porządkująca dokumenty przy regałach"
                fill
                sizes="(max-width: 960px) 100vw, 46vw"
              />
            </div>

            <div className={styles.wellenaCopy}>
              <h2 id="wellena-title">
                Wiesz, co chcesz zrobić. Ale czekasz, aż poczujesz się pewniej.
              </h2>
              <p className={styles.wellenaSummary}>
                Wellena pomaga Ci przyjrzeć się wątpliwościom, dostrzec własne
                mocne strony i wybrać mały krok – w pracy, własnym biznesie lub
                ważnej sprawie osobistej.
              </p>
              <ul className={styles.wellenaFacts}>
                <li>
                  <span aria-hidden="true">⏱</span>
                  <span>
                    30 dni, 3 rozmowy w tygodniu po 20–50 minut – w Twoim tempie
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">🔒</span>
                  <span>
                    Prywatnie. Bez grupy, bez wystawiania się, bez oceniania
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">📖</span>
                  <span>
                    Metoda oparta na psychologii pozytywnej, nie na motywacyjnych
                    hasłach
                  </span>
                </li>
              </ul>
              <a
                className={[styles.primaryButton, styles.wellenaOutlineCta].join(
                  " ",
                )}
                href="https://wellena.pl"
                onClick={(event) => trackWellenaClick(event, "wynik-wellena")}
              >
                Zobacz, jak działa Wellena
              </a>
            </div>
          </div>

          <div className={styles.wellenaDetails}>
            <h3>Podczas 30-dniowego programu:</h3>
            <ul className={styles.wellenaList}>
              <li>lepiej poznasz swoje mocne strony, wartości i zasoby,</li>
              <li>
                przyjrzysz się przekonaniom i reakcjom, które Cię zatrzymują,
              </li>
              <li>nauczysz się lepiej dbać o swoje potrzeby i granice,</li>
              <li>
                przełożysz wnioski na małe działania budujące zaufanie do siebie.
              </li>
            </ul>
            <p className={styles.wellenaPurpose}>
              Celem nie jest stworzenie „nowej Ciebie”. Chodzi o to, żeby
              wyraźniej zobaczyć, na czym możesz się oprzeć, i zrobić krok, który
              do tej pory odkładałaś.
            </p>
            <a
              className={[styles.primaryButton, styles.wellenaCta].join(" ")}
              href="https://wellena.pl"
              onClick={(event) => trackWellenaClick(event, "wynik-program")}
            >
              Zrób kolejny krok z Welleną
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export function SelfAssessment() {
  const [answers, setAnswers] = useState<Array<AnswerValue | null>>(
    emptyAnswers,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("questions");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [website, setWebsite] = useState("");
  const questionRef = useRef<HTMLLegendElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const submissionRef = useRef<{ email: string; id: string } | null>(null);
  // Każde zdarzenie lejka liczymy raz na wejście, pytania raz na numer —
  // cofanie się i ponowne renderowanie nie dubluje danych w raportach.
  const tracked = useRef({
    view: false,
    start: false,
    complete: false,
    result: false,
    questions: new Set<number>(),
  });

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const stored = restoreAssessment();
      if (stored?.kind === "result") {
        setScore(stored.score);
        setStage("result");
      } else if (stored?.kind === "progress") {
        setAnswers(stored.answers);
        setCurrentIndex(stored.currentIndex);
        setStage(stored.stage);
      }
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || stage === "result") return;

    persistProgress({ answers, currentIndex, stage });
  }, [answers, currentIndex, hydrated, stage]);

  useEffect(() => {
    if (hydrated && stage === "questions") {
      questionRef.current?.focus({ preventScroll: true });
    }
  }, [currentIndex, hydrated, stage]);

  useEffect(() => {
    if (!hydrated) return;
    const seen = tracked.current;

    if (stage !== "result" && !seen.view) {
      seen.view = true;
      trackEvent({ event: "self_assessment_view", testVersion: TEST_VERSION });
    }

    if (stage === "questions" && !seen.questions.has(currentIndex)) {
      seen.questions.add(currentIndex);
      trackEvent({
        event: "self_assessment_question_view",
        testVersion: TEST_VERSION,
        questionNumber: currentIndex + 1,
      });
    }

    if (stage === "result" && !seen.result) {
      seen.result = true;
      trackEvent({
        event: "self_assessment_result_view",
        testVersion: TEST_VERSION,
      });
    }
  }, [currentIndex, hydrated, stage]);

  useEffect(() => {
    if (!hydrated || stage !== "result") return;

    window.scrollTo({ top: 0, behavior: "auto" });
    document
      .getElementById("result-title")
      ?.focus({ preventScroll: true });
  }, [hydrated, stage]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const selectAnswer = (value: AnswerValue) => {
    if (isAdvancing) return;

    const seen = tracked.current;
    if (!seen.start && answers.every((answer) => answer === null)) {
      seen.start = true;
      trackEvent({ event: "self_assessment_start", testVersion: TEST_VERSION });
    }
    if (!seen.complete && currentIndex === QUESTIONS.length - 1) {
      seen.complete = true;
      trackEvent({
        event: "self_assessment_complete",
        testVersion: TEST_VERSION,
      });
    }

    setAnswers((current) => {
      const updated = [...current];
      updated[currentIndex] = value;
      return updated;
    });
    setIsAdvancing(true);

    advanceTimer.current = setTimeout(() => {
      if (currentIndex === QUESTIONS.length - 1) {
        setStage("email");
      } else {
        setCurrentIndex((index) => index + 1);
      }
      setIsAdvancing(false);
    }, 320);
  };

  const goBack = () => {
    if (submittingRef.current) return;
    setSubmitError(null);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setIsAdvancing(false);

    if (stage === "email") {
      setStage("questions");
      setCurrentIndex(QUESTIONS.length - 1);
      return;
    }

    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setSubmitError(null);
    setEmailInvalid(false);
    if (!hasCompleteAnswers(answers)) {
      const missingIndex = answers.findIndex((answer) => !isAnswerValue(answer));
      setCurrentIndex(Math.max(0, missingIndex));
      setStage("questions");
      setSubmitError("Odpowiedz na wszystkie pytania, aby otrzymać wynik.");
      return;
    }
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setEmailInvalid(true);
      setSubmitError("Sprawdź, czy adres e-mail jest poprawny.");
      return;
    }
    if (!marketingConsent) {
      setSubmitError("Zaznacz zgodę, aby przejść do wyniku.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (submissionRef.current?.email !== normalizedEmail) {
        // Reuse this ID on retries, including an upstream timeout after a write.
        submissionRef.current = {
          email: normalizedEmail,
          id: createSubmissionId(),
        };
      }
      const calculatedScore = scoreAnswers(answers);
      await submitLead({
        email: normalizedEmail,
        submissionId: submissionRef.current.id,
        website,
      });
      // Dopiero po zapisaniu leada. Bez adresu i bez wyniku — tylko fakt wysłania.
      trackEvent({
        event: "self_assessment_email_submit",
        testVersion: TEST_VERSION,
      });
      persistResult(calculatedScore);
      clearProgress();
      setScore(calculatedScore);
      setStage("result");
      // Keep the contact out of browser storage and discard it from React state.
      setEmail("");
      setMarketingConsent(false);
      submissionRef.current = null;
    } catch (error) {
      setSubmitError(
        error instanceof LeadSubmissionError
          ? error.message
          : "Nie udało się przygotować wyniku. Spróbuj ponownie.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  const currentQuestion = QUESTIONS[currentIndex];

  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <a
          href="https://www.pracowniazycia.pl/"
          aria-label="Pracownia Życia — strona główna"
        >
          <Image
            className={styles.headerPracowniaLogo}
            src="/brand/logotyp-poziomy-deskryptor--grafit-krem.svg"
            alt="Pracownia Życia — Mental Fitness"
            width={300}
            height={66}
            priority
          />
        </a>
        <a
          className={styles.headerWellenaLink}
          href="https://wellena.pl"
          aria-label="Wellena — strona programu"
          onClick={(event) => trackWellenaClick(event, "naglowek")}
        >
          <Image
            className={styles.headerWellenaLogo}
            src="/brand/wellena-logo-horizontal-color-transparent-1200.png"
            alt="Wellena"
            width={1200}
            height={400}
          />
        </a>
      </header>

      {stage === "result" && score !== null ? (
        <ResultScreen score={score} />
      ) : (
        <main className={styles.main}>
          <section className={styles.hero} aria-labelledby="page-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Bezpłatny test samooceny</p>
            <h1 id="page-title">Jak oceniasz siebie?</h1>
            <p className={styles.lead}>
              Kompetencje masz. Sprawdź, czy ufasz sobie na tyle, żeby z nich
              korzystać. Odpowiedz na 10 pytań, odbierz wynik i jedno praktyczne
              ćwiczenie na pewność siebie.
            </p>
            <p className={styles.meta}>
              <span>2–3 minuty</span>
              <span aria-hidden="true">·</span>
              <span>bezpłatnie</span>
              <span aria-hidden="true">·</span>
              <span>wynik od razu na ekranie</span>
            </p>
            <div className={styles.guidance}>
              <span className={styles.guidanceMark} aria-hidden="true">
                i
              </span>
              <p>
                Odpowiadaj tak, jak jest, nie tak, jak „powinno być”. Nie ma
                dobrych ani złych odpowiedzi.
              </p>
            </div>
          </div>

            <div className={styles.testColumn}>
              <div className={styles.card}>
              {stage === "questions" && (
                <div className={styles.questionView}>
                  {submitError && (
                    <p className={styles.formError} role="alert">
                      {submitError}
                    </p>
                  )}
                  <div className={styles.progressHeader}>
                    <span>
                      Pytanie {currentIndex + 1} z {QUESTIONS.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label="Postęp testu"
                    aria-valuemin={1}
                    aria-valuemax={QUESTIONS.length}
                    aria-valuenow={currentIndex + 1}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <fieldset className={styles.fieldset} disabled={isAdvancing}>
                    <legend
                      ref={questionRef}
                      className={styles.question}
                      tabIndex={-1}
                    >
                      {currentQuestion.text}
                    </legend>

                    <div className={styles.answers}>
                      {ANSWER_OPTIONS.map((option) => {
                        const checked = answers[currentIndex] === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`${styles.answer} ${checked ? styles.answerSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option.value}
                              checked={checked}
                              onChange={() => selectAnswer(option.value)}
                            />
                            <span className={styles.radioMark} aria-hidden="true" />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={goBack}
                      disabled={currentIndex === 0 || isAdvancing}
                    >
                      <span aria-hidden="true">←</span> Wstecz
                    </button>
                    <span className={styles.autoAdvance}>Przejdziesz dalej automatycznie</span>
                  </div>
                </div>
              )}

              {stage === "email" && (
                <div className={styles.emailView}>
                  <p className={styles.cardEyebrow}>Wynik jest gotowy</p>
                  <h2>Zobacz Twój wynik</h2>
                  <p className={styles.cardLead}>
                    Podaj adres e-mail, aby zobaczyć wynik testu.
                  </p>

                  <form
                    onSubmit={submitEmail}
                    className={styles.emailForm}
                    noValidate
                    aria-busy={isSubmitting}
                  >
                    <label className={styles.emailLabel} htmlFor="email">
                      Adres e-mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      disabled={isSubmitting}
                      aria-invalid={emailInvalid}
                      aria-describedby={submitError ? "email-note email-error" : "email-note"}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailInvalid(false);
                        setSubmitError(null);
                      }}
                      placeholder="twoj@email.pl"
                    />

                    <p id="email-note" className={styles.emailNote}>
                      Wynik zobaczysz od razu na tej stronie. Na razie nie
                      wysyłamy go e-mailem.
                    </p>

                    <div className={styles.honeypot} aria-hidden="true">
                      <label htmlFor="website">Pozostaw to pole puste</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        autoComplete="off"
                        tabIndex={-1}
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </div>

                    <div className={styles.consent}>
                      <input
                        id="marketing-consent"
                        name="marketingConsent"
                        type="checkbox"
                        required
                        disabled={isSubmitting}
                        aria-describedby={submitError ? "email-error" : undefined}
                        checked={marketingConsent}
                        onChange={(event) => {
                          setMarketingConsent(event.target.checked);
                          setSubmitError(null);
                        }}
                      />
                      <label htmlFor="marketing-consent">
                        {MARKETING_CONSENT_INTRO}{" "}
                        <a
                          href={PRIVACY_POLICY_URL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Polityką prywatności
                        </a>
                        . {MARKETING_CONSENT_WITHDRAWAL}
                      </label>
                    </div>

                    {submitError && (
                      <p id="email-error" className={styles.formError} role="alert">
                        {submitError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Przygotowuję wynik…" : "Pokaż mój wynik"}
                    </button>

                  </form>

                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={goBack}
                    disabled={isSubmitting}
                  >
                    <span aria-hidden="true">←</span> Wróć do ostatniego pytania
                  </button>
                </div>
              )}

            </div>

              <p className={styles.disclaimer}>
                Test nie jest narzędziem klinicznym ani diagnozą psychologiczną.
                Wynik nie jest oceną Ciebie ani miarą Twojej wartości — to punkt
                odniesienia do samorefleksji.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
