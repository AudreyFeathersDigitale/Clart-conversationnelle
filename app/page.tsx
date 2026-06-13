"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SHEET_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbwS0JBCrdO4Fi7jkp04qbRTeVmruOpAZQW5jZQutSZ2vEm_-viyAR_C2vZmY9wiwClJPQ/exec";

const leadMagnetUrl = "https://leadmagnet-zid6.onrender.com/";
const auraUrl = "https://aura-diagnostic.onrender.com/";
const googleSheetDemoUrl = "https://script.google.com/macros/s/AKfycbwy_lJ3__qWOhLPP6GEoLvwRuPWzBDPBKCgvJi9pAFYs_TRmAt2_fYSiHdMo_BlfwKP/exec";

const introMessages = [
  "👋 Hello, moi c’est Clarté 🤍",
  "On va prendre quelques minutes pour regarder comment les bonnes personnes te découvrent, ce qui les aide à avancer, et ce qui repose encore trop sur toi aujourd’hui.",
  "Pas de grand audit compliqué ici. Juste une discussion pour faire ressortir les points de friction, les opportunités de fluidité, et la place possible d’une IA supervisée dans ton parcours prospect.",
];

const introCards = [
  "🧭 3 à 5 minutes maximum",
  "💬 Une discussion, pas un formulaire",
  "✨ Une synthèse personnalisée à la fin",
];

type Tag =
  | "acquisition_instable"
  | "conversion_faible"
  | "prospects_non_qualifies"
  | "manque_suivi"
  | "dependance_humaine"
  | "aucun_systeme"
  | "maturite_lead_magnet"
  | "interet_relais"
  | "lead_chaud";

type TextStep = {
  id: string;
  question: string;
  type: "text";
  placeholder: string;
};

type ChoiceStep = {
  id: string;
  question: string;
  type: "choice";
  multiple: boolean;
  options: string[];
  maxSelections?: number;
  helperText?: string;
};

type Step = TextStep | ChoiceStep;

type ChatMessage = {
  id: string;
  role: "agent" | "user" | "card";
  text: string;
  typed?: boolean;
  action?: "nextIntro" | "showQuestionInputs" | "afterReaction" | "nextInsight";
};

const steps: Step[] = [
  {
    id: "business_context",
    question: "Tu fais quoi exactement aujourd’hui, et pour qui ?",
    type: "text",
    placeholder:
      "Ex : j’accompagne les indépendants à mieux vendre leur offre, je suis coach, consultante, thérapeute, formatrice…",
  },
  {
    id: "discovery_channels",
    question:
      "Aujourd’hui, les bonnes personnes te découvrent surtout comment ?",
    type: "choice",
    multiple: true,
    maxSelections: 4,
    helperText: "Tu peux sélectionner plusieurs réponses.",
    options: [
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
    question:
      "Et comment gardes-tu le lien avec les personnes qui montrent de l’intérêt pour ce que tu proposes ?",
    type: "choice",
    multiple: true,
    maxSelections: 4,
    helperText: "Choisis ce qui ressemble le plus à ton fonctionnement actuel.",
    options: [
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
    question:
      "Dans tout le parcours prospect, qu’est-ce qui repose encore beaucoup sur toi aujourd’hui ?",
    type: "choice",
    multiple: true,
    maxSelections: 4,
    helperText: "Tu peux choisir les points les plus présents.",
    options: [
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
    question:
      "À ce rythme-là, qu’est-ce qui pourrait devenir difficile à tenir dans les prochains mois ?",
    type: "text",
    placeholder:
      "Ex : continuer à relancer, garder un flux régulier, répondre à tout le monde, créer du contenu, ne pas perdre les personnes intéressées…",
  },
  {
    id: "positive_projection",
    question:
      "Et si une partie de tout ça devenait plus fluide demain… qu’est-ce qui changerait le plus pour toi ?",
    type: "choice",
    multiple: true,
    maxSelections: 4,
    helperText: "L’idée est de voir ce qui créerait le plus de soulagement.",
    options: [
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
    question:
      "Quand tu entends parler d’IA dans la relation client, qu’est-ce qui te rend le plus sceptique ou prudent aujourd’hui ?",
    type: "choice",
    multiple: true,
    maxSelections: 3,
    helperText: "C’est important de garder ce point en tête.",
    options: [
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
    question:
      "Et dans toute cette relation, qu’est-ce qui doit absolument rester humain selon toi ?",
    type: "choice",
    multiple: true,
    maxSelections: 4,
    helperText: "Ce sont les parties que l’IA ne devrait pas remplacer.",
    options: [
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

const insightMessages = [
  "Merci. J’ai maintenant une vision beaucoup plus claire de ce qui fonctionne déjà… et de ce qui repose encore beaucoup sur toi aujourd’hui.",
  "Ce que tu viens de décrire montre surtout le chemin entre la visibilité, l’intérêt, la confiance et le passage à l’action.",
  "C’est souvent dans cet espace que des prospects se perdent : pas parce qu’ils ne sont pas intéressés, mais parce qu’il manque parfois un relais clair, humain et régulier.",
  "Je peux te préparer une synthèse personnalisée avec les points de friction, les opportunités de fluidification, ce qui pourrait être soutenu par une IA et ce qui devrait rester humain.",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectTags(stepId: string, value: string | string[]): Tag[] {
  const text = normalizeText(Array.isArray(value) ? value.join(" ") : value);
  const tags = new Set<Tag>();

  if (
    text.includes("instagram") ||
    text.includes("linkedin") ||
    text.includes("bouche") ||
    text.includes("seo") ||
    text.includes("google") ||
    text.includes("publicite") ||
    text.includes("contenu") ||
    text.includes("prospection")
  ) {
    tags.add("acquisition_instable");
  }

  if (
    text.includes("relancer") ||
    text.includes("relance") ||
    text.includes("suivi") ||
    text.includes("garder le lien") ||
    text.includes("dm") ||
    text.includes("messages prives") ||
    text.includes("rien de structure") ||
    text.includes("perdre") ||
    text.includes("perdent")
  ) {
    tags.add("manque_suivi");
  }

  if (
    text.includes("qualifier") ||
    text.includes("mieux comprendre") ||
    text.includes("besoin") ||
    text.includes("prospects mieux prepares") ||
    text.includes("bonnes personnes")
  ) {
    tags.add("prospects_non_qualifies");
  }

  if (
    text.includes("confiance") ||
    text.includes("rassurer") ||
    text.includes("achat") ||
    text.includes("closing") ||
    text.includes("passage a l'action") ||
    text.includes("passer a l'action")
  ) {
    tags.add("conversion_faible");
  }

  if (
    text.includes("repose") ||
    text.includes("temps") ||
    text.includes("energie") ||
    text.includes("charge mentale") ||
    text.includes("tout gerer") ||
    text.includes("manuellement") ||
    text.includes("moi-meme") ||
    text.includes("au feeling") ||
    text.includes("regulierement")
  ) {
    tags.add("dependance_humaine");
  }

  if (
    text.includes("rien de structure") ||
    text.includes("au feeling") ||
    text.includes("pas vraiment") ||
    text.includes("je ne sais pas")
  ) {
    tags.add("aucun_systeme");
  }

  if (
    text.includes("lead magnet") ||
    text.includes("challenge") ||
    text.includes("live") ||
    text.includes("newsletter") ||
    text.includes("emails") ||
    text.includes("experience interactive") ||
    text.includes("communaute")
  ) {
    tags.add("maturite_lead_magnet");
  }

  if (stepId === "positive_projection") {
    tags.add("interet_relais");
  }

  return Array.from(tags);
}

function getReaction(stepId: string, value: string | string[], allTags: Tag[]) {
  const text = normalizeText(Array.isArray(value) ? value.join(" ") : value);
  const has = (tag: Tag) => allTags.includes(tag);

  if (stepId === "business_context") {
    return "Merci, c’est beaucoup plus clair 🙂\n\nJe vais garder ton activité en tête pour regarder la suite avec le bon angle.";
  }

  if (stepId === "discovery_channels") {
    if (text.includes("bouche") && !text.includes("publicite")) {
      return "Intéressant.\n\nLe bouche-à-oreille crée souvent une confiance forte, mais il peut aussi rendre l’acquisition moins prévisible si rien ne vient soutenir le flux.";
    }

    if (text.includes("contenu") || text.includes("instagram") || text.includes("linkedin")) {
      return "Je vois.\n\nTu as donc déjà des points d’entrée vers ton activité. La vraie question devient souvent : qu’est-ce qui se passe après cette première attention ?";
    }

    return "Ok, je note.\n\nÇa me donne une première lecture de la façon dont les personnes arrivent jusqu’à toi aujourd’hui.";
  }

  if (stepId === "engagement_channels") {
    if (text.includes("rien de structure")) {
      return "Ok, je vois.\n\nDonc une fois l’intérêt créé, la continuité dépend encore beaucoup du moment, de ton énergie ou des échanges directs. C’est souvent là que de bonnes opportunités se refroidissent.";
    }

    if (text.includes("dm") || text.includes("appel")) {
      return "Je comprends.\n\nLe lien existe, mais il passe encore beaucoup par de l’échange humain direct. C’est qualitatif, mais ça peut vite devenir difficile à tenir quand le volume augmente.";
    }

    if (has("maturite_lead_magnet")) {
      return "Intéressant 🙂\n\nTu as déjà une forme de relais. La question maintenant, c’est de savoir s’il aide vraiment les personnes à avancer, se clarifier et arriver plus prêtes à la suite.";
    }

    return "Ok, c’est utile.\n\nJe commence à voir comment l’intérêt continue à vivre après le premier contact.";
  }

  if (stepId === "human_load") {
    if (has("dependance_humaine") && has("manque_suivi")) {
      return "Oui, je vois très bien.\n\nUne partie importante du parcours semble encore reposer sur ta disponibilité : répondre, expliquer, relancer, maintenir le lien. C’est souvent invisible, mais très énergivore.";
    }

    if (has("prospects_non_qualifies")) {
      return "Je comprends.\n\nLe sujet n’est pas seulement d’attirer plus de monde. Il y a aussi tout ce travail de clarification avant que la personne soit vraiment prête à avancer.";
    }

    return "Je vois.\n\nCe que tu viens de sélectionner montre où ton énergie est le plus sollicitée dans le parcours prospect.";
  }

  if (stepId === "three_month_risk") {
    if (has("dependance_humaine")) {
      return "Oui… et c’est souvent là que le sujet devient plus profond que l’acquisition.\n\nSi le système dépend trop de toi, la croissance peut finir par créer plus de charge que de liberté.";
    }

    if (has("manque_suivi")) {
      return "Je comprends.\n\nLe risque, ce n’est pas forcément de manquer d’intérêt autour de ton activité. C’est plutôt de laisser une partie de cet intérêt retomber faute de continuité.";
    }

    return "Merci, c’est précieux.\n\nÇa permet de voir ce que la situation actuelle pourrait continuer à produire si rien ne devient plus fluide.";
  }

  if (stepId === "positive_projection") {
    return "Très clair 🙂\n\nLà, on commence à voir ce qui créerait vraiment de la valeur : pas remplacer la relation, mais rendre certaines étapes plus fluides, plus régulières et moins dépendantes de ton énergie disponible.";
  }

  if (stepId === "ai_skepticism") {
    if (text.includes("pas vraiment de doute")) {
      return "Ok, intéressant.\n\nDans ce cas, l’enjeu sera surtout de voir où l’IA peut apporter de la fluidité sans complexifier ton fonctionnement.";
    }

    if (text.includes("faux") || text.includes("robotique") || text.includes("impersonnelles")) {
      return "Je comprends complètement.\n\nUne IA mal pensée peut vite donner cette impression. C’est justement pour ça que l’objectif n’est pas de faire semblant d’être humain, mais de soutenir la relation avec un cadre clair et supervisé.";
    }

    if (text.includes("controle")) {
      return "Oui, c’est un point essentiel.\n\nUne IA utile dans la relation client doit rester contrôlable : ton ton, tes limites, tes intentions, et ce qui doit être transmis à l’humain.";
    }

    return "C’est une réserve très saine.\n\nL’IA ne devrait pas rendre la relation plus froide. Elle devrait surtout enlever de la friction autour de ce qui peut être préparé, clarifié ou suivi.";
  }

  if (stepId === "human_boundary") {
    return "Exactement.\n\nC’est cette limite qui compte : l’IA peut préparer, clarifier, qualifier ou maintenir le lien… mais la confiance, la nuance et les décisions importantes doivent rester humaines.";
  }

  return "Merci, c’est noté 🙂";
}

function buildSummary(tags: Tag[], answers: Record<string, string | string[]>) {
  const has = (tag: Tag) => tags.includes(tag);
  const business = answers.business_context;
  const businessIntro =
    typeof business === "string" && business.trim()
      ? `Tu m’as expliqué ceci sur ton activité : ${business.trim()}`
      : "Ton activité semble dépendre d’une relation de confiance avec les bonnes personnes";

  if (has("dependance_humaine") && has("manque_suivi")) {
    return `${businessIntro}. Ce que je retiens surtout : une partie importante du parcours prospect semble encore reposer sur ta disponibilité personnelle, notamment pour expliquer, rassurer, relancer ou maintenir le lien.`;
  }

  if (has("prospects_non_qualifies") || has("conversion_faible")) {
    return `${businessIntro}. Ce que je retiens surtout : le sujet n’est pas seulement d’attirer plus de monde, mais d’aider les bonnes personnes à se clarifier, à comprendre la valeur de ton offre et à arriver plus prêtes à la suite.`;
  }

  if (has("aucun_systeme")) {
    return `${businessIntro}. Ce que je retiens surtout : il y a probablement un espace à structurer entre l’intérêt initial et le passage à l’action, pour éviter que les personnes intéressées disparaissent ou refroidissent.`;
  }

  if (has("maturite_lead_magnet")) {
    return `${businessIntro}. Ce que je retiens surtout : tu as déjà des points de relais avec tes prospects. Le prochain niveau serait de les rendre plus personnalisés, plus qualifiants et plus utiles pour préparer la relation humaine.`;
  }

  return `${businessIntro}. Ce que je retiens surtout : il existe un espace intéressant entre visibilité, intérêt, confiance et passage à l’action. C’est précisément cet espace qu’une expérience IA supervisée peut aider à fluidifier.`;
}

function Typewriter({
  text,
  speed = 16,
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
        setTimeout(() => onDoneRef.current?.(), 300);
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

    const timeout = setTimeout(() => {
      setVisible(true);
    }, 80 * index);

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

export default function Home() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [phase, setPhase] = useState<
    "intro" | "diagnostic" | "insight" | "leadCapture" | "finalPage"
  >("intro");

  const [introIndex, setIntroIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [insightIndex, setInsightIndex] = useState(0);

  const [textAnswer, setTextAnswer] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [questionReady, setQuestionReady] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [tags, setTags] = useState<Tag[]>([]);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const conversationBottomRef = useRef<HTMLDivElement | null>(null);
  const currentQuestion = steps[currentStep];

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const leadIsValid = firstName.trim().length > 0 && emailIsValid;

  const score = useMemo(() => {
    let total = 35;
    if (tags.includes("interet_relais")) total += 20;
    if (tags.includes("dependance_humaine")) total += 12;
    if (tags.includes("manque_suivi")) total += 10;
    if (tags.includes("conversion_faible")) total += 10;
    if (tags.includes("prospects_non_qualifies")) total += 8;
    if (tags.includes("aucun_systeme")) total += 5;
    return Math.min(total, 100);
  }, [tags]);

  const leadTemperature = useMemo(() => {
    if (score >= 75) return "Chaud";
    if (score >= 55) return "Tiède";
    return "Découverte";
  }, [score]);

  const summary = useMemo(() => buildSummary(tags, answers), [tags, answers]);

  useEffect(() => {
    conversationBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, phase, textAnswer, selectedChoices, questionReady]);

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

  const showFirstQuestion = () => {
    setPhase("diagnostic");
    setCurrentStep(0);
    setQuestionReady(false);
    addAgent(steps[0].question, "showQuestionInputs");
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
        setTimeout(() => addCard(benefit), 250 + index * 350);
      });

      setTimeout(showFirstQuestion, 250 + introCards.length * 350 + 400);
      return;
    }

    if (message.action === "showQuestionInputs") {
      setQuestionReady(true);
      return;
    }

    if (message.action === "afterReaction") {
      const nextStep = currentStep + 1;

      if (nextStep >= steps.length) {
        setPhase("insight");
        setInsightIndex(0);
        addAgent(summary, "nextInsight");
        return;
      }

      setCurrentStep(nextStep);
      setTextAnswer("");
      setSelectedChoices([]);
      setQuestionReady(false);
      addAgent(steps[nextStep].question, "showQuestionInputs");
      return;
    }

    if (message.action === "nextInsight") {
      const nextIndex = insightIndex + 1;

      if (nextIndex < insightMessages.length) {
        setInsightIndex(nextIndex);
        addAgent(insightMessages[nextIndex], "nextInsight");
        return;
      }

      setPhase("leadCapture");
      setTimeout(() => {
        addAgent(
          "Je peux maintenant t’envoyer ta synthèse personnalisée 🙂\n\nElle reprend ce qui semble bloquer, ce qui pourrait devenir plus fluide, et la place que pourrait prendre une IA supervisée sans remplacer l’humain.\n\nOù puis-je te l’envoyer ? Pense à regarder tes mails ensuite."
        );
      }, 350);
    }
  };

  const submitStepAnswer = (value: string | string[]) => {
    const normalizedValue = Array.isArray(value)
      ? value.filter(Boolean)
      : value.trim();

    if (Array.isArray(normalizedValue) && normalizedValue.length === 0) return;
    if (!Array.isArray(normalizedValue) && !normalizedValue) return;

    const visibleAnswer = Array.isArray(normalizedValue)
      ? normalizedValue.join(", ")
      : normalizedValue;

    const newStepTags = detectTags(currentQuestion.id, normalizedValue);
    const newTags = Array.from(new Set([...tags, ...newStepTags]));

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: normalizedValue,
    }));
    setTags(newTags);

    addUser(visibleAnswer);
    setQuestionReady(false);
    addAgent(getReaction(currentQuestion.id, normalizedValue, newTags), "afterReaction");

    setTextAnswer("");
    setSelectedChoices([]);
  };

  const toggleChoice = (option: string) => {
    if (currentQuestion.type !== "choice") return;

    if (!currentQuestion.multiple) {
      submitStepAnswer(option);
      return;
    }

    setSelectedChoices((prev) => {
      if (prev.includes(option)) {
        return prev.filter((item) => item !== option);
      }

      if (
        typeof currentQuestion.maxSelections === "number" &&
        prev.length >= currentQuestion.maxSelections
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
      tags,
      score,
      temperature: leadTemperature,
      statut:
        leadTemperature === "Chaud"
          ? "Prospect chaud"
          : leadTemperature === "Tiède"
          ? "Prospect tiède"
          : "Prospect découverte",
      summary,
      business: answers.business_context ?? "",
      discoveryChannels: Array.isArray(answers.discovery_channels)
        ? answers.discovery_channels.join(", ")
        : answers.discovery_channels ?? "",
      engagementChannels: Array.isArray(answers.engagement_channels)
        ? answers.engagement_channels.join(", ")
        : answers.engagement_channels ?? "",
      humanLoad: Array.isArray(answers.human_load)
        ? answers.human_load.join(", ")
        : answers.human_load ?? "",
      threeMonthRisk: answers.three_month_risk ?? "",
      positiveProjection: Array.isArray(answers.positive_projection)
        ? answers.positive_projection.join(", ")
        : answers.positive_projection ?? "",
      aiSkepticism: Array.isArray(answers.ai_skepticism)
        ? answers.ai_skepticism.join(", ")
        : answers.ai_skepticism ?? "",
      humanBoundary: Array.isArray(answers.human_boundary)
        ? answers.human_boundary.join(", ")
        : answers.human_boundary ?? "",
    };

    localStorage.setItem("diag-clarte-lead", JSON.stringify(payload));
    console.log("Lead V2 :", payload);

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
            Une courte expérience conversationnelle pour voir comment les bonnes
            personnes te découvrent, ce qui les aide à avancer, et ce qui
            pourrait devenir plus fluide dans ton acquisition.
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
            🛡️ Tes réponses restent confidentielles et servent uniquement à
            personnaliser l’expérience.
          </div>
        </section>
      </main>
    );
  }

  if (phase === "finalPage") {
    const showAura = tags.includes("dependance_humaine") || score >= 65;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EFE8] p-4 pb-[env(safe-area-inset-bottom)] text-[#25255A] sm:p-6">
        <section className="w-full max-w-2xl rounded-[2rem] border border-[#E5DDD0] bg-white/70 p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAE3F7] text-2xl sm:h-16 sm:w-16">
            ✨
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl">
            Merci {firstName} 🤍
          </h1>

          <div className="mt-6 rounded-2xl border border-[#E5DDD0] bg-white px-5 py-5 text-left sm:px-6">
            <p className="font-semibold">Ce que Clarté a repéré :</p>
            <p className="mt-2 text-sm leading-6 text-[#25255A]/70">{summary}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-[#E5DDD0] bg-white px-5 py-5 text-left sm:px-6">
            <p className="font-semibold">
              Maintenant, tu peux visualiser comment ce type d’expérience peut fonctionner :
            </p>

            <p className="mt-2 text-sm leading-6 text-[#25255A]/70">
              une expérience côté prospect, puis les informations utiles récupérées côté entreprise.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <a
              href={leadMagnetUrl}
              target="_blank"
              className="block w-full rounded-2xl bg-[#8E63E8] px-5 py-4 text-center font-semibold text-white transition hover:scale-[1.01] sm:px-6"
            >
              Voir l’expérience côté prospect →
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
              <p className="font-serif text-2xl text-[#25255A]">
                Tu veux aller plus loin ?
              </p>

              <p className="mt-2 text-sm leading-6 text-[#25255A]/70">
                Ce que tu as partagé laisse penser que le sujet dépasse peut-être
                une simple expérience d’entrée : suivi, qualification, charge
                mentale, continuité relationnelle… AURA™ peut t’aider à regarder ça plus en profondeur.
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

  const currentIsText =
    phase === "diagnostic" &&
    questionReady &&
    currentQuestion.type === "text";

  const currentIsChoice =
    phase === "diagnostic" &&
    questionReady &&
    currentQuestion.type === "choice";

  const progress = started
    ? Math.min(100, Math.round(((currentStep + 1) / steps.length) * 100))
    : 0;

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

            <p className="mt-4 text-xs font-semibold">
              Expérience conversationnelle Clarté
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5">
            {messages.map((message) => {
              if (message.role === "user") {
                return <UserBubble key={message.id} text={message.text} />;
              }

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

            {currentIsText && (
              <div className="scroll-mt-32 space-y-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="min-h-[120px] w-full rounded-2xl border border-[#E5DDD0] bg-white px-4 py-3 outline-none transition focus:border-[#8E63E8] sm:min-h-[160px] sm:px-5 sm:py-4"
                />

                <button
                  onClick={() => submitStepAnswer(textAnswer)}
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
                {currentQuestion.type === "choice" &&
                  currentQuestion.helperText && (
                    <p className="text-center text-xs font-medium text-[#25255A]/60">
                      {currentQuestion.helperText}
                      {typeof currentQuestion.maxSelections === "number" &&
                        selectedChoices.length > 0 &&
                        ` (${selectedChoices.length}/${currentQuestion.maxSelections})`}
                    </p>
                  )}

                <div className="flex flex-col gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const selected = selectedChoices.includes(option);

                    return (
                      <StaggeredChoiceButton
                        key={option}
                        option={option}
                        index={index}
                        selected={selected}
                        onClick={() => toggleChoice(option)}
                      />
                    );
                  })}
                </div>

                {currentQuestion.multiple && (
                  <button
                    onClick={() => submitStepAnswer(selectedChoices)}
                    disabled={selectedChoices.length === 0}
                    className={`w-full rounded-2xl px-5 py-4 font-semibold text-white transition sm:px-6 ${
                      selectedChoices.length > 0
                        ? "bg-[#8E63E8] hover:scale-[1.01]"
                        : "cursor-not-allowed bg-[#BEB8B0]"
                    }`}
                  >
                    Continuer →
                  </button>
                )}
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
                Clarté avance avec tes réponses pour comprendre ton activité, pas pour remplir un formulaire.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Une vraie prise de recul</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                L’agent fait ressortir ce qui bloque, ce qui pèse encore sur toi, et ce qui pourrait devenir plus fluide.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Une synthèse personnalisée</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                À la fin, tu reçois une synthèse claire avec les frictions détectées et les opportunités possibles.
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