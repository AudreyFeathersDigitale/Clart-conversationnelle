"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SHEET_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbwS0JBCrdO4Fi7jkp04qbRTeVmruOpAZQW5jZQutSZ2vEm_-viyAR_C2vZmY9wiwClJPQ/exec";

// ⚠️ Remets ici tes URLs si celle du webhook ci-dessus a été modifiée par erreur.
const leadMagnetUrl = "https://leadmagnet-zid6.onrender.com/";
const auraUrl = "https://aura-diagnostic.onrender.com/";
const googleSheetDemoUrl =
  "https://script.google.com/macros/s/AKfycbwy_lJ3__qWOhLPP6GEoLvwRuPWzBDPBKCgvJi9pAFYs_TRmAt2_fYSiHdMo_BlfwKP/exec";

type StageId =
  | "business_context"
  | "discovery_channels"
  | "engagement_channels"
  | "human_load"
  | "three_month_risk"
  | "positive_projection"
  | "ai_skepticism"
  | "human_boundary";

type Stage = {
  id: StageId;
  label: string;
  objective: string;
  defaultQuestion: string;
  inputType: "text" | "choice";
  placeholder?: string;
  choices?: string[];
  maxSelections?: number;
  helperText?: string;
};

type ChatMessage = {
  id: string;
  role: "agent" | "user" | "card";
  text: string;
  typed?: boolean;
  action?:
    | "nextIntro"
    | "showStageInputs"
    | "afterAnswer"
    | "showClarificationInput"
    | "afterClarification"
    | "afterSummary"
    | "leadPrompt";
};

type ConversationResponse = {
  message: string;
  shouldClarify: boolean;
  clarificationQuestion: string | null;
};

const introMessages = [
  "👋 Hello, moi c’est Clarté 🤍",
  "On va prendre quelques minutes pour regarder comment tu attires tes clients aujourd’hui, et ce qui pourrait devenir plus simple à tenir.",
  "Pas besoin de préparer quoi que ce soit. Réponds simplement avec tes mots.",
];

const introCards = [
  "🧭 3 à 5 minutes maximum",
  "💬 Une discussion, pas un formulaire",
  "✨ Une synthèse personnalisée à la fin",
];

const stages: Stage[] = [
  {
    id: "business_context",
    label: "Activité",
    objective:
      "Comprendre précisément ce que fait la personne, qui elle accompagne, et le type de problème ou désir qu'elle adresse.",
    defaultQuestion: "Tu fais quoi exactement aujourd’hui, et pour qui ?",
    inputType: "text",
    placeholder:
      "Ex : j’aide les indépendants à vendre leur offre, j’accompagne les femmes à mieux comprendre leur énergie, je forme des équipes…",
  },
  {
    id: "discovery_channels",
    label: "Découverte",
    objective:
      "Comprendre par quels canaux les bonnes personnes découvrent l'activité aujourd'hui.",
    defaultQuestion:
      "Aujourd’hui, les bonnes personnes te découvrent surtout comment ?",
    inputType: "choice",
    maxSelections: 4,
    helperText: "Tu peux sélectionner plusieurs réponses.",
    choices: [
      "Instagram",
      "LinkedIn",
      "Bouche-à-oreille",
      "SEO / Google",
      "Publicité",
      "Contenu",
      "Email / prospection",
      "Autre",
    ],
  },
  {
    id: "engagement_channels",
    label: "Lien",
    objective:
      "Comprendre comment la personne garde le lien avec les prospects déjà intéressés : emails, live, challenge, lead magnet, DM, appel, communauté ou rien de structuré.",
    defaultQuestion:
      "Et comment gardes-tu le lien avec les personnes qui montrent de l’intérêt pour ce que tu proposes ?",
    inputType: "choice",
    maxSelections: 4,
    helperText: "Choisis ce qui ressemble le plus à ton fonctionnement actuel.",
    choices: [
      "Newsletter",
      "Emails",
      "Live",
      "Challenge",
      "Lead magnet",
      "Expérience interactive",
      "DM / messages privés",
      "Appel",
      "Communauté",
      "Rien de structuré",
      "Autre",
    ],
  },
  {
    id: "human_load",
    label: "Charge",
    objective:
      "Identifier ce qui repose encore beaucoup sur la personne dans le parcours d'acquisition et de conversion.",
    defaultQuestion:
      "Dans tout ça, qu’est-ce qui repose encore beaucoup sur toi aujourd’hui ?",
    inputType: "choice",
    maxSelections: 4,
    helperText: "Tu peux choisir les points les plus présents.",
    choices: [
      "Répondre aux questions",
      "Expliquer mon offre",
      "Relancer les personnes intéressées",
      "Qualifier les prospects",
      "Créer du contenu régulièrement",
      "Prospecter manuellement",
      "Rassurer avant l’achat",
      "Organiser les appels",
      "Tout gérer au feeling",
    ],
  },
  {
    id: "three_month_risk",
    label: "3 mois",
    objective:
      "Faire émerger la vision à trois mois si rien ne change, sans dramatiser ni faire peur.",
    defaultQuestion:
      "À ce rythme-là, qu’est-ce qui pourrait devenir difficile à tenir dans les prochains mois ?",
    inputType: "text",
    placeholder:
      "Ex : continuer à relancer, garder un flux régulier, répondre à tout le monde, ne pas perdre les personnes intéressées…",
  },
  {
    id: "positive_projection",
    label: "Projection",
    objective:
      "Créer une projection mentale positive : ce qui changerait si certaines étapes devenaient plus fluides.",
    defaultQuestion:
      "Et si une partie de tout ça devenait plus fluide demain… qu’est-ce qui changerait le plus pour toi ?",
    inputType: "choice",
    maxSelections: 4,
    helperText: "L’idée est de voir ce qui créerait le plus de soulagement.",
    choices: [
      "Gagner du temps",
      "Avoir des prospects mieux préparés",
      "Ne plus devoir tout relancer moi-même",
      "Créer plus de confiance avant l’échange",
      "Avoir une acquisition plus régulière",
      "Mieux comprendre les besoins des prospects",
      "Me concentrer sur les appels et la relation",
      "Réduire ma charge mentale",
    ],
  },
  {
    id: "ai_skepticism",
    label: "Doutes IA",
    objective:
      "Faire exprimer les doutes ou réserves sur l'IA dans la relation client pour pouvoir rassurer ensuite.",
    defaultQuestion:
      "Quand tu entends parler d’IA dans la relation client, qu’est-ce qui te rend le plus sceptique ou prudent aujourd’hui ?",
    inputType: "choice",
    maxSelections: 3,
    helperText: "C’est important de garder ce point en tête.",
    choices: [
      "Que ça fasse faux ou robotique",
      "Perdre le côté humain",
      "Des réponses trop impersonnelles",
      "Des automatisations agressives",
      "Manquer de contrôle sur ce qui est dit",
      "Ne pas savoir comment l’utiliser correctement",
      "Je n’ai pas vraiment de doute",
    ],
  },
  {
    id: "human_boundary",
    label: "Humain",
    objective:
      "Comprendre ce qui doit absolument rester humain dans la relation, pour positionner l'IA comme soutien supervisé.",
    defaultQuestion:
      "Et dans toute cette relation, qu’est-ce qui doit absolument rester humain selon toi ?",
    inputType: "choice",
    maxSelections: 4,
    helperText: "Ce sont les parties que l’IA ne devrait pas remplacer.",
    choices: [
      "Les appels",
      "L’écoute émotionnelle",
      "Le closing",
      "La stratégie",
      "La relation de confiance",
      "Les décisions importantes",
      "L’accompagnement client",
      "La négociation",
    ],
  },
];

function Typewriter({
  text,
  speed = 14,
  onDone,
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    let completed = false;

    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length && !completed) {
        completed = true;
        clearInterval(interval);
        setTimeout(() => onDoneRef.current?.(), 250);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

function AgentBubble({
  text,
  typed,
  onDone,
}: {
  text: string;
  typed?: boolean;
  onDone?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAE3F7] text-sm sm:h-10 sm:w-10">
        🤖
      </div>
      <div className="max-w-[85%] whitespace-pre-line rounded-2xl bg-[#F7F3ED] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-xl sm:px-6 sm:py-5 sm:text-base sm:leading-7">
        {typed ? <Typewriter text={text} onDone={onDone} /> : text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl bg-[#EAE3F7] px-4 py-3 text-sm leading-6 text-[#25255A] sm:max-w-md sm:px-5 sm:py-4">
      {text}
    </div>
  );
}

function StaggeredChoiceButton({
  option,
  index,
  selected,
  onClick,
}: {
  option: string;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timeout = setTimeout(() => setVisible(true), 70 * index);
    return () => clearTimeout(timeout);
  }, [index, option]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 180ms ease-out, transform 180ms ease-out",
      }}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-all sm:px-5 sm:py-4 ${
        selected
          ? "border-[#8E63E8] bg-[#EAE3F7] text-[#25255A]"
          : "border-[#E5DDD0] bg-white hover:border-[#9C93D8] hover:bg-[#FAF7FF]"
      }`}
    >
      {option}
    </button>
  );
}

async function callConversationApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/clarte-conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Erreur API Clarté conversation");
  }

  return (await response.json()) as ConversationResponse;
}

function toVisibleAnswer(value: string | string[]) {
  return Array.isArray(value) ? value.join(", ") : value;
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<
    "intro" | "diagnostic" | "leadCapture" | "finalPage"
  >("intro");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [introIndex, setIntroIndex] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [questionReady, setQuestionReady] = useState(false);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [totalClarifications, setTotalClarifications] = useState(0);
  const [summary, setSummary] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const conversationBottomRef = useRef<HTMLDivElement | null>(null);
  const currentStage = stages[currentStageIndex];
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const leadIsValid = firstName.trim().length > 0 && emailIsValid;

  const progress = useMemo(
    () => Math.min(100, Math.round(((currentStageIndex + 1) / stages.length) * 100)),
    [currentStageIndex]
  );

  const conversationForApi = useMemo(
    () =>
      messages
        .filter((message) => message.role === "agent" || message.role === "user")
        .map((message) => ({
          role: message.role as "agent" | "user",
          text: message.text,
        })),
    [messages]
  );

  useEffect(() => {
    conversationBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, questionReady, textAnswer, selectedChoices, loading, clarificationAnswer]);

  const addAgent = (text: string, action?: ChatMessage["action"]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role: "agent",
        text,
        typed: true,
        action,
      },
    ]);
  };

  const addUser = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role: "user",
        text,
      },
    ]);
  };

  const addCard = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role: "card",
        text,
      },
    ]);
  };

  const getRemainingStages = (fromIndex: number) =>
    stages.slice(fromIndex + 1).map((stage) => ({
      id: stage.id,
      label: stage.label,
      objective: stage.objective,
    }));

  const askStageQuestion = async (stageIndex: number) => {
    const stage = stages[stageIndex];
    setLoading(true);
    setQuestionReady(false);
    setAwaitingClarification(false);
    setClarificationQuestion("");
    setClarificationAnswer("");
    setTextAnswer("");
    setSelectedChoices([]);

    try {
      const data = await callConversationApi({
        mode: "ask_question",
        currentStage: stage,
        currentStageIndex: stageIndex,
        totalStages: stages.length,
        answers,
        conversation: conversationForApi,
        remainingStages: getRemainingStages(stageIndex),
        totalClarifications,
      });

      addAgent(data.message || stage.defaultQuestion, "showStageInputs");
    } catch (error) {
      console.error(error);
      addAgent(stage.defaultQuestion, "showStageInputs");
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (nextAnswers: Record<string, string | string[]>) => {
    setLoading(true);
    setQuestionReady(false);

    try {
      const data = await callConversationApi({
        mode: "summary",
        answers: nextAnswers,
        conversation: conversationForApi,
        totalClarifications,
      });

      const generatedSummary = data.message;
      setSummary(generatedSummary);
      addAgent(generatedSummary, "afterSummary");
    } catch (error) {
      console.error(error);
      const fallbackSummary =
        "Ce que je retiens : il y a déjà une forme d’intérêt autour de ton activité, mais certaines étapes semblent encore beaucoup dépendre de toi. L’enjeu serait de rendre le passage entre curiosité, confiance et action plus simple à suivre, sans enlever la partie humaine de ta relation.";
      setSummary(fallbackSummary);
      addAgent(fallbackSummary, "afterSummary");
    } finally {
      setLoading(false);
    }
  };

  const moveToNextStage = (nextAnswers: Record<string, string | string[]>) => {
    const nextIndex = currentStageIndex + 1;

    if (nextIndex >= stages.length) {
      generateSummary(nextAnswers);
      return;
    }

    setCurrentStageIndex(nextIndex);
    setTimeout(() => askStageQuestion(nextIndex), 250);
  };

  const handleMessageDone = (message: ChatMessage) => {
    if (message.action === "nextIntro") {
      const nextIndex = introIndex + 1;

      if (nextIndex < introMessages.length) {
        setIntroIndex(nextIndex);
        addAgent(introMessages[nextIndex], "nextIntro");
        return;
      }

      introCards.forEach((benefit, index) => {
        setTimeout(() => addCard(benefit), 250 + index * 300);
      });

      setTimeout(() => askStageQuestion(0), 250 + introCards.length * 300 + 350);
      return;
    }

    if (message.action === "showStageInputs") {
      setQuestionReady(true);
      return;
    }

    if (message.action === "showClarificationInput") {
      setQuestionReady(true);
      return;
    }

    if (message.action === "afterAnswer" || message.action === "afterClarification") {
      moveToNextStage(answers);
      return;
    }

    if (message.action === "afterSummary") {
      setTimeout(() => {
        addAgent(
          "Je peux te l’envoyer par mail pour que tu puisses la relire tranquillement. Où puis-je te l’envoyer ? Pense à regarder tes mails ensuite 🙂",
          "leadPrompt"
        );
      }, 300);
      return;
    }

    if (message.action === "leadPrompt") {
      setPhase("leadCapture");
    }
  };

  const startConversation = () => {
    setStarted(true);
    setPhase("intro");
    setIntroIndex(0);
    setMessages([
      {
        id: "intro-0",
        role: "agent",
        text: introMessages[0],
        typed: true,
        action: "nextIntro",
      },
    ]);
  };

  const submitStageAnswer = async (value: string | string[]) => {
    const normalizedValue = Array.isArray(value) ? value.filter(Boolean) : value.trim();

    if (Array.isArray(normalizedValue) && normalizedValue.length === 0) return;
    if (!Array.isArray(normalizedValue) && !normalizedValue) return;

    const visibleAnswer = toVisibleAnswer(normalizedValue);
    const nextAnswers = { ...answers, [currentStage.id]: normalizedValue };

    setAnswers(nextAnswers);
    addUser(visibleAnswer);
    setQuestionReady(false);
    setLoading(true);

    try {
      const data = await callConversationApi({
        mode: "after_answer",
        currentStage,
        currentStageIndex,
        totalStages: stages.length,
        userAnswer: normalizedValue,
        answers: nextAnswers,
        conversation: conversationForApi,
        remainingStages: getRemainingStages(currentStageIndex),
        totalClarifications,
      });

      if (data.shouldClarify && data.clarificationQuestion && totalClarifications < 2) {
        setAwaitingClarification(true);
        setClarificationQuestion(data.clarificationQuestion);
        setTotalClarifications((prev) => prev + 1);
        addAgent(`${data.message}\n\n${data.clarificationQuestion}`, "showClarificationInput");
      } else {
        addAgent(data.message, "afterAnswer");
      }
    } catch (error) {
      console.error(error);
      addAgent("Oui… je vois.", "afterAnswer");
    } finally {
      setLoading(false);
      setTextAnswer("");
      setSelectedChoices([]);
    }
  };

  const submitClarification = async () => {
    const answer = clarificationAnswer.trim();
    if (!answer) return;

    const key = `${currentStage.id}_precision`;
    const nextAnswers = { ...answers, [key]: answer };
    setAnswers(nextAnswers);
    addUser(answer);
    setQuestionReady(false);
    setLoading(true);

    try {
      const data = await callConversationApi({
        mode: "after_clarification",
        currentStage,
        currentStageIndex,
        totalStages: stages.length,
        clarificationAnswer: answer,
        answers: nextAnswers,
        conversation: conversationForApi,
        remainingStages: getRemainingStages(currentStageIndex),
        totalClarifications,
      });

      setAwaitingClarification(false);
      setClarificationQuestion("");
      setClarificationAnswer("");
      addAgent(data.message, "afterClarification");
    } catch (error) {
      console.error(error);
      setAwaitingClarification(false);
      addAgent("Ok, c’est plus clair.", "afterClarification");
    } finally {
      setLoading(false);
    }
  };

  const toggleChoice = (option: string) => {
    if (currentStage.inputType !== "choice") return;

    setSelectedChoices((prev) => {
      if (prev.includes(option)) return prev.filter((item) => item !== option);

      if (
        typeof currentStage.maxSelections === "number" &&
        prev.length >= currentStage.maxSelections
      ) {
        return prev;
      }

      return [...prev, option];
    });
  };

  const submitLead = async () => {
    if (!leadIsValid || sending) return;

    setSending(true);

    const payload = {
      createdAt: new Date().toISOString(),
      firstName,
      email,
      answers,
      summary,
      source: "Clarté acquisition OpenAI semi-guidé",
    };

    localStorage.setItem("diag-clarte-lead", JSON.stringify(payload));

    try {
      await fetch(GOOGLE_SHEET_WEBHOOK, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Erreur envoi Google Sheet :", error);
    }

    setSending(false);
    setPhase("finalPage");
  };

  if (!started) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EFE8] p-4 pb-[env(safe-area-inset-bottom)] text-[#25255A] sm:p-6">
        <section className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#E5DDD0] bg-white/60 p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center gap-2 font-serif text-xl sm:mb-10">
            <span className="text-[#B5966B]">✧</span>
            <span>Diag Clarté</span>
          </div>

          <h1 className="font-serif text-4xl leading-[0.95] sm:text-5xl">
            Attirer des clients.
            <br />
            <span className="text-[#8E63E8]">Sans tout porter seul.</span>
            <br />
            Avec plus de clarté.
          </h1>

          <p className="mt-6 text-sm leading-6 text-[#25255A]/75">
            Une courte expérience conversationnelle pour voir ce qui pourrait devenir plus clair, plus fluide et plus léger dans ton acquisition.
          </p>

          <button
            type="button"
            onClick={startConversation}
            className="group mt-8 w-full cursor-pointer focus:outline-none"
            aria-label="Commencer l’expérience conversationnelle"
          >
            <p className="mb-3 text-center text-sm font-semibold text-[#8E63E8]">
              Tester l’expérience ✨
            </p>

            <div className="relative mx-auto flex h-36 w-36 items-center justify-center sm:h-52 sm:w-52">
              <div className="absolute inset-0 rounded-full bg-[#9C93D8]/30 blur-2xl transition group-hover:bg-[#8E63E8]/40" />
              <Image
                src="/robot.png"
                alt="Mini agent Diag Clarté"
                width={220}
                height={220}
                priority
                className="relative z-10 transition duration-300 group-hover:-translate-y-1 group-hover:scale-105"
              />
            </div>
          </button>

          <div className="mt-8 rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 text-center text-xs text-[#25255A]/70">
            🛡️ Tes réponses restent confidentielles et servent uniquement à personnaliser l’expérience.
          </div>
        </section>
      </main>
    );
  }

  if (phase === "finalPage") {
    const showAura = true;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EFE8] p-4 pb-[env(safe-area-inset-bottom)] text-[#25255A] sm:p-6">
        <section className="w-full max-w-2xl rounded-[2rem] border border-[#E5DDD0] bg-white/70 p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAE3F7] text-2xl sm:h-16 sm:w-16">
            ✨
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl">Merci {firstName} 🤍</h1>

          <div className="mt-6 rounded-2xl border border-[#E5DDD0] bg-white px-5 py-5 text-left sm:px-6">
            <p className="font-semibold">Ce que Clarté a repéré :</p>
            <p className="mt-2 text-sm leading-6 text-[#25255A]/70">{summary}</p>
          </div>

          <div className="mt-8 space-y-4">
            <a
              href={leadMagnetUrl}
              target="_blank"
              className="block w-full rounded-2xl bg-[#8E63E8] px-5 py-4 text-center font-semibold text-white transition hover:scale-[1.01] sm:px-6"
            >
              Voir une expérience côté prospect →
            </a>

            <a
              href={googleSheetDemoUrl}
              target="_blank"
              className="block w-full rounded-2xl border border-[#E5DDD0] bg-white px-5 py-4 text-center font-semibold text-[#25255A] transition hover:border-[#8E63E8] sm:px-6"
            >
              Voir les données récupérées côté entreprise →
            </a>
          </div>

          {showAura && (
            <div className="mt-8 rounded-2xl border border-[#E5DDD0] bg-[#FFF8EF] px-5 py-5 text-center sm:px-6">
              <p className="font-serif text-2xl text-[#25255A]">Tu veux aller plus loin ?</p>
              <p className="mt-2 text-sm leading-6 text-[#25255A]/70">
                Si tu veux visualiser comment un agent IA supervisé pourrait s’adapter à ton activité, tu peux découvrir AURA™.
              </p>
              <a
                href={auraUrl}
                target="_blank"
                className="mt-5 block w-full rounded-2xl border border-[#8E63E8] bg-white px-5 py-4 text-center font-semibold text-[#8E63E8] transition hover:bg-[#FAF7FF] sm:px-6"
              >
                Découvrir AURA™ →
              </a>
            </div>
          )}
        </section>
      </main>
    );
  }

  const currentIsClarification =
    phase === "diagnostic" && questionReady && awaitingClarification;
  const currentIsText =
    phase === "diagnostic" &&
    questionReady &&
    !awaitingClarification &&
    currentStage.inputType === "text";
  const currentIsChoice =
    phase === "diagnostic" &&
    questionReady &&
    !awaitingClarification &&
    currentStage.inputType === "choice";

  return (
    <main className="min-h-screen bg-[#F2EFE8] p-4 pb-[env(safe-area-inset-bottom)] text-[#25255A] sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-32px)] max-w-6xl grid-cols-1 gap-4 sm:min-h-[calc(100vh-48px)] sm:gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col rounded-[2rem] border border-[#E5DDD0] bg-white/70 p-4 shadow-sm sm:p-8">
          <div className="mx-auto mb-8 w-full max-w-md">
            <div className="relative h-1 rounded-full bg-[#DAD4CB]">
              <div
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#8E63E8]/60 transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#8E63E8] transition-all"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            <p className="mt-4 text-xs font-semibold">Expérience conversationnelle Clarté</p>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5">
            {messages.map((message) => {
              if (message.role === "user") return <UserBubble key={message.id} text={message.text} />;

              if (message.role === "card") {
                return (
                  <div
                    key={message.id}
                    className="ml-11 rounded-2xl bg-[#FFF8EF] px-4 py-3 text-sm leading-6 sm:ml-14 sm:px-5"
                  >
                    {message.text}
                  </div>
                );
              }

              return (
                <AgentBubble
                  key={message.id}
                  text={message.text}
                  typed={message.typed}
                  onDone={() => handleMessageDone(message)}
                />
              );
            })}

            {loading && (
              <div className="ml-11 max-w-[220px] rounded-2xl bg-[#F7F3ED] px-4 py-3 text-sm leading-6 text-[#25255A]/60 sm:ml-14">
                Clarté prend une seconde…
              </div>
            )}

            {currentIsClarification && (
              <div className="scroll-mt-32 space-y-4">
                <textarea
                  value={clarificationAnswer}
                  onChange={(e) => setClarificationAnswer(e.target.value)}
                  placeholder="Réponds simplement, avec tes mots…"
                  className="min-h-[120px] w-full rounded-2xl border border-[#E5DDD0] bg-white px-4 py-3 outline-none transition focus:border-[#8E63E8] sm:min-h-[150px] sm:px-5 sm:py-4"
                />
                <button
                  onClick={submitClarification}
                  disabled={!clarificationAnswer.trim()}
                  className={`w-full rounded-2xl px-5 py-4 font-semibold text-white transition sm:px-6 ${
                    clarificationAnswer.trim()
                      ? "bg-[#8E63E8] hover:scale-[1.01]"
                      : "cursor-not-allowed bg-[#BEB8B0]"
                  }`}
                >
                  Envoyer →
                </button>
              </div>
            )}

            {currentIsText && (
              <div className="scroll-mt-32 space-y-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder={currentStage.placeholder}
                  className="min-h-[120px] w-full rounded-2xl border border-[#E5DDD0] bg-white px-4 py-3 outline-none transition focus:border-[#8E63E8] sm:min-h-[160px] sm:px-5 sm:py-4"
                />
                <button
                  onClick={() => submitStageAnswer(textAnswer)}
                  disabled={!textAnswer.trim()}
                  className={`w-full rounded-2xl px-5 py-4 font-semibold text-white transition sm:px-6 ${
                    textAnswer.trim()
                      ? "bg-[#8E63E8] hover:scale-[1.01]"
                      : "cursor-not-allowed bg-[#BEB8B0]"
                  }`}
                >
                  Envoyer →
                </button>
              </div>
            )}

            {currentIsChoice && (
              <div className="scroll-mt-32 space-y-4">
                {currentStage.helperText && (
                  <p className="text-center text-xs font-medium text-[#25255A]/60">
                    {currentStage.helperText}
                    {typeof currentStage.maxSelections === "number" &&
                      selectedChoices.length > 0 &&
                      ` (${selectedChoices.length}/${currentStage.maxSelections})`}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  {(currentStage.choices ?? []).map((option, index) => (
                    <StaggeredChoiceButton
                      key={option}
                      option={option}
                      index={index}
                      selected={selectedChoices.includes(option)}
                      onClick={() => toggleChoice(option)}
                    />
                  ))}
                </div>

                <button
                  onClick={() => submitStageAnswer(selectedChoices)}
                  disabled={selectedChoices.length === 0}
                  className={`w-full rounded-2xl px-5 py-4 font-semibold text-white transition sm:px-6 ${
                    selectedChoices.length > 0
                      ? "bg-[#8E63E8] hover:scale-[1.01]"
                      : "cursor-not-allowed bg-[#BEB8B0]"
                  }`}
                >
                  Continuer →
                </button>
              </div>
            )}

            {phase === "leadCapture" && (
              <div className="scroll-mt-32 space-y-4">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ton prénom"
                  className="w-full rounded-2xl border border-[#E5DDD0] bg-white px-4 py-3 outline-none transition focus:border-[#8E63E8] sm:px-5 sm:py-4"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ton email"
                  type="email"
                  className="w-full rounded-2xl border border-[#E5DDD0] bg-white px-4 py-3 outline-none transition focus:border-[#8E63E8] sm:px-5 sm:py-4"
                />
                <button
                  onClick={submitLead}
                  disabled={!leadIsValid || sending}
                  className={`w-full rounded-2xl px-5 py-4 font-semibold text-white transition sm:px-6 ${
                    leadIsValid && !sending
                      ? "bg-[#8E63E8] hover:scale-[1.01]"
                      : "cursor-not-allowed bg-[#BEB8B0]"
                  }`}
                >
                  {sending ? "Envoi en cours..." : "Recevoir ma synthèse →"}
                </button>
              </div>
            )}

            <div ref={conversationBottomRef} />
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[#E5DDD0] bg-[#FFF8EF] p-5 shadow-sm sm:p-8">
          <h2 className="font-serif text-2xl">Ce que tu vas vivre</h2>
          <div className="mt-6 space-y-4 sm:mt-8">
            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Une vraie conversation</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                Clarté peut demander une précision si ta réponse est trop vague.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Une vraie prise de recul</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                L’agent avance étape par étape, sans transformer l’expérience en formulaire.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Une synthèse personnalisée</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                À la fin, tu reçois une synthèse claire et réutilisable.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center font-serif text-lg italic text-[#B5966B] sm:mt-10 sm:text-xl">
            Une discussion, pas un formulaire.
          </p>
        </aside>
      </section>
    </main>
  );
}
