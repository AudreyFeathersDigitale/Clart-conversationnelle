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
  "On va prendre quelques minutes pour regarder ce qui se passe aujourd’hui entre tes prospects, ton acquisition et ton offre.",
  "Pas de grand audit compliqué ici. Juste une discussion pour mieux comprendre ce qui bloque peut-être… et te montrer comment un lead magnet peut faire plus qu’un simple freebie.",
];

const introCards = [
  "🧭 3 à 5 minutes maximum",
  "💬 Une discussion, pas un formulaire",
  "✨ Un exemple concret à la fin",
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
    id: "main_gap",
    question:
      "Quand tu regardes ton activité aujourd’hui, qu’est-ce qui te parle le plus ?",
    type: "choice",
    multiple: true,
    maxSelections: 3,
    helperText: "Tu peux choisir jusqu’à 3 réponses.",
    options: [
      "Attirer plus de prospects",
      "Attirer les bonnes personnes",
      "Convertir les prospects intéressés",
      "Garder le lien après un premier intérêt",
      "Tout repose encore beaucoup sur moi",
    ],
  },
  {
    id: "business_context",
    question:
      "Pour que je comprenne mieux : tu fais quoi exactement, et tu accompagnes qui ?",
    type: "text",
    placeholder:
      "Ex : je suis coach business, j’aide les indépendants à structurer leur offre…",
  },
  {
    id: "current_acquisition",
    question: "Aujourd’hui, les personnes qui viennent vers toi te découvrent surtout comment ?",
    type: "choice",
    multiple: true,
    options: [
      "Instagram",
      "LinkedIn",
      "TikTok",
      "Facebook",
      "Bouche-à-oreille",
      "SEO / Google",
      "Publicité",
      "Email / prospection",
      "Autre",
    ],
  },
  {
    id: "friction_detail",
    question:
      "Et dans ce parcours-là, qu’est-ce qui te frustre le plus aujourd’hui ?",
    type: "text",
    placeholder:
    "Ex : les gens aiment mon contenu mais ne passent pas à l’action, je relance peu, je perds le lien, je manque de temps, la prospection ou la qualification des prospects...",
  },
  {
    id: "relay_system",
    question:
      "Quand quelqu’un montre de l’intérêt pour ce que tu fais, tu as déjà quelque chose qui prend le relais derrière ?",
    type: "choice",
    multiple: true,
    options: [
      "Un lead magnet",
      "Une newsletter",
      "Une séquence email",
      "Un appel découverte",
      "Des messages privés",
      "Rien de structuré pour l’instant",
      "Je ne sais pas trop",
    ],
  },
  {
  id: "lead_magnet_awareness",
  question:
    "Quand tu entends “lead magnet”, qu’est-ce qui te vient le plus en tête ?",
  type: "choice",
  multiple: true,
  maxSelections: 3,
  helperText: "Tu peux choisir plusieurs réponses.",
  options: [
    "Un PDF gratuit ou une checklist",
    "Un quiz ou un diagnostic",
    "Une expérience interactive",
    "Un moyen de récupérer des emails",
    "Un moyen d’engager ou qualifier les prospects",
    "Je ne connais pas vraiment",
  ],
},
  {
    id: "projection",
    question:
      "Si un système pouvait mieux comprendre tes prospects, les aider à clarifier leur besoin et te transmettre des réponses utiles… ça t’aiderait surtout à quoi ?",
    type: "choice",
    multiple: true,
    options: [
      "Gagner du temps",
      "Mieux qualifier les prospects",
      "Créer plus de confiance avant un échange",
      "Éduquer les prospects avant mon offre",
      "Relancer moins manuellement",
      "Augmenter les demandes entrantes",
      "Je ne suis pas sûr(e)",
    ],
  },
];

const insightMessages = [
  "Tu vois ce qui vient de se passer ? 🙂",
  "En quelques réponses, on comprend déjà mieux ce qui se joue : tes canaux, tes blocages, ton niveau de suivi, et ce que tes prospects auraient besoin de clarifier.",
  "C’est exactement là qu’un lead magnet conversationnel devient intéressant : il ne récupère pas juste un contact, il prépare déjà la suite.",
  "Je peux maintenant te montrer un exemple concret : ce que vit le prospect, puis ce que tu récupères côté entreprise.",
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
    text.includes("pas regulier") ||
    text.includes("irregulier") ||
    text.includes("ca depend") ||
    text.includes("attirer plus") ||
    text.includes("demandes entrantes")
  ) {
    tags.add("acquisition_instable");
  }

  if (
    text.includes("convert") ||
    text.includes("passent pas") ||
    text.includes("passage a l'action") ||
    text.includes("confiance avant")
  ) {
    tags.add("conversion_faible");
  }

  if (
    text.includes("bonnes personnes") ||
    text.includes("qualifier") ||
    text.includes("qualifies") ||
    text.includes("pas prets")
  ) {
    tags.add("prospects_non_qualifies");
  }

  if (
    text.includes("garder le lien") ||
    text.includes("relance") ||
    text.includes("suivi") ||
    text.includes("perds le lien") ||
    text.includes("messages prives")
  ) {
    tags.add("manque_suivi");
  }

  if (
    text.includes("tout repose") ||
    text.includes("temps") ||
    text.includes("fatigue") ||
    text.includes("manuellement") ||
    text.includes("moi")
  ) {
    tags.add("dependance_humaine");
  }

  if (
    text.includes("rien de structure") ||
    text.includes("je ne sais pas") ||
    text.includes("pas vraiment")
  ) {
    tags.add("aucun_systeme");
  }

  if (
    text.includes("lead magnet") ||
    text.includes("quiz") ||
    text.includes("diagnostic") ||
    text.includes("experience interactive") ||
    text.includes("sequence email")
  ) {
    tags.add("maturite_lead_magnet");
  }

  if (
    stepId === "projection" && !text.includes("pas sur")) {
    tags.add("interet_relais");
  }

  return Array.from(tags);
}

function getReaction(stepId: string, value: string | string[], allTags: Tag[]) {
  const text = normalizeText(Array.isArray(value) ? value.join(" ") : value);
  const has = (tag: Tag) => allTags.includes(tag);

  if (stepId === "main_gap") {
    const selected = Array.isArray(value) ? value : [value];

    if (selected.length >= 3) {
      return "Ah oui, je vois 🙂\n\nIl y a plusieurs sujets en même temps. Souvent, ça veut dire que le problème n’est pas juste à un endroit précis… mais plutôt dans tout le parcours entre l’intérêt et le passage à l’action.";
    }

    if (has("dependance_humaine")) {
      return "Je comprends.\n\nQuand beaucoup de choses reposent encore sur toi, même une activité qui fonctionne peut vite devenir lourde à porter.";
    }

    if (has("manque_suivi") && has("conversion_faible")) {
      return "Oui… je vois très bien le sujet.\n\nIl y a de l’intérêt, mais le moment entre “je suis intéressé” et “je passe à l’action” semble encore fragile.";
    }

    if (has("prospects_non_qualifies")) {
      return "Hmm, intéressant 🙂\n\nDonc le sujet n’est peut-être pas seulement d’attirer plus de monde… mais surtout d’attirer les bonnes personnes, au bon moment.";
    }

    if (has("conversion_faible")) {
      return "Oui, ça parle beaucoup ça.\n\nIl y a peut-être déjà de l’intérêt autour de ton activité, mais quelque chose bloque encore avant la décision.";
    }

    if (has("manque_suivi")) {
      return "Je vois.\n\nC’est souvent là que ça se joue : les personnes montrent un intérêt, puis le lien se dilue parce qu’il n’y a pas vraiment de relais derrière.";
    }

    if (has("acquisition_instable")) {
      return "Ok, je comprends 🙂\n\nLe sujet semble surtout tourner autour de la régularité : réussir à créer plus d’opportunités, sans dépendre uniquement des moments où tout s’aligne.";
    }
  }

  if (stepId === "business_context") {
    return "Merci, c’est beaucoup plus clair 🙂\n\nJe vais garder ton activité en tête pour lire la suite avec le bon angle.";
  }

  if (stepId === "current_acquisition") {
    return "Intéressant.\n\nTu as déjà des points d’entrée vers ton activité. Maintenant, la vraie question, c’est ce qui se passe après ce premier contact.";
  }

  if (stepId === "friction_detail") {
    if (has("conversion_faible")) {
      return "Oui, je vois.\n\nDans ce cas, le sujet n’est peut-être pas juste d’être plus visible. Il y a sûrement une étape à créer pour aider les personnes à mûrir leur décision.";
    }

    if (has("manque_suivi")) {
      return "Je comprends.\n\nC’est typiquement le genre de moment où un relais peut éviter que l’intérêt retombe… ou que tout repose sur des relances manuelles.";
    }

    if (has("dependance_humaine")) {
      return "Ah oui… ça peut vite devenir lourd.\n\nAttirer, expliquer, rassurer, relancer, qualifier… quand tout passe par toi, la charge monte très vite.";
    }

    return "Je comprends 🙂\n\nCe que tu décris est précieux, parce que ça montre l’endroit exact où le parcours prospect perd peut-être de l’élan.";
  }

  if (stepId === "relay_system") {
    if (has("aucun_systeme")) {
      return "Ok, je vois.\n\nDonc aujourd’hui, entre l’intérêt et la suite, il n’y a pas encore vraiment de relais structuré. C’est souvent là que de bonnes opportunités se perdent.";
    }

    if (has("maturite_lead_magnet")) {
      return "Ah intéressant 🙂\n\nTu as déjà une base. La question maintenant, c’est : est-ce que ce système aide vraiment les prospects à avancer avant d’échanger avec toi ?";
    }

    return "Ok, je note.\n\nÇa me permet de voir s’il existe déjà une continuité entre la première curiosité et le passage à l’action.";
  }

  if (stepId === "lead_magnet_awareness") {
    const selected = Array.isArray(value) ? value : [value];

    if (selected.includes("Je ne connais pas vraiment")) {
      return "Pas de souci 🙂\n\nBeaucoup d’entrepreneurs utilisent déjà des formes de lead magnets sans forcément mettre ce mot dessus : quiz, ressources, mini diagnostics, contenus gratuits…";
    }

    if (
      selected.includes("Une expérience interactive") &&
      selected.includes("Un moyen d’engager ou qualifier les prospects")
    ) {
      return "Ah, intéressant 🙂\n\nTu le vois déjà comme quelque chose de plus vivant qu’un simple contenu gratuit. Et c’est exactement là que ça devient stratégique.";
    }

    if (
      selected.includes("Un PDF gratuit ou une checklist") &&
      selected.includes("Un moyen de récupérer des emails")
    ) {
      return "Oui, c’est souvent la première image qu’on en a.\n\nUn contenu gratuit, un email en échange… Mais en réalité, ça peut aller beaucoup plus loin que ça.";
    }

    if (
      selected.includes("Un quiz ou un diagnostic") ||
      selected.includes("Une expérience interactive")
    ) {
      return "Oui 🙂\n\nEt quand c’est bien pensé, ce type d’expérience peut déjà engager, qualifier et préparer la suite naturellement.";
    }

    return "Oui 🙂\n\nAujourd’hui, les lead magnets les plus intéressants ne servent pas seulement à capter un email. Ils créent déjà une première relation.";
  }

  if (stepId === "projection") {
    if (text.includes("pas sur")) {
      return "Je comprends.\n\nParfois, ce besoin n’est pas évident tant qu’on n’a pas vu ce que ce type de système peut révéler côté prospect.";
    }

    return "Très clair 🙂\n\nLà, on voit bien que la valeur n’est pas seulement dans l’automatisation. Elle est surtout dans la qualité de la relation créée avant même l’échange humain.";
  }

  return "Merci, c’est noté 🙂";
}

function buildSummary(tags: Tag[], answers: Record<string, string | string[]>) {
  const has = (tag: Tag) => tags.includes(tag);

  if (has("dependance_humaine") && has("manque_suivi")) {
    return "Ce que je retiens surtout : une partie importante du parcours semble encore reposer sur toi, notamment le suivi, la relance ou la continuité avec les prospects.";
  }

  if (has("prospects_non_qualifies") || has("conversion_faible")) {
    return "Ce que je retiens surtout : le sujet n’est pas seulement d’attirer plus de monde. Il semble surtout important d’aider les bonnes personnes à comprendre plus vite si ton offre est faite pour elles.";
  }

  if (has("aucun_systeme")) {
    return "Ce que je retiens surtout : il y a peut-être un vrai espace à créer entre la première curiosité et la suite du parcours. Un relais plus clair pourrait éviter que l’intérêt se perde.";
  }

  if (has("maturite_lead_magnet")) {
    return "Ce que je retiens surtout : tu as déjà une certaine conscience des outils d’acquisition. Le prochain niveau serait de rendre ce point d’entrée plus qualifiant, plus relationnel et plus utile pour la suite.";
  }

  const business = answers.business_context;
  if (typeof business === "string" && business.trim()) {
    return "Ce que je retiens surtout : ton activité gagnerait sûrement à mieux capter ce qui se passe dans la tête du prospect avant qu’il arrive jusqu’à un échange humain.";
  }

  return "Ce que je retiens surtout : il y a un espace intéressant entre acquisition, qualification et conversion. C’est précisément cet espace qu’un lead magnet conversationnel peut éclairer.";
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
          "Je peux t’envoyer l’exemple complet 🙂\n\nTu verras les deux faces : ce que vit le prospect, et ce que tu récupères côté entreprise.\n\nOù puis-je te l’envoyer ?"
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
      mainGap: answers.main_gap ?? "",
      business: answers.business_context ?? "",
      acquisition: Array.isArray(answers.current_acquisition)
        ? answers.current_acquisition.join(", ")
        : answers.current_acquisition ?? "",
      frustration: answers.friction_detail ?? "",
      relaySystem: Array.isArray(answers.relay_system)
        ? answers.relay_system.join(", ")
        : answers.relay_system ?? "",
      leadMagnetAwareness: answers.lead_magnet_awareness ?? "",
      projection: Array.isArray(answers.projection)
        ? answers.projection.join(", ")
        : answers.projection ?? "",
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
            Un mini agent.
            <br />
            <span className="text-[#8E63E8]">Une vraie prise de recul.</span>
            <br />
            Plus de clarté.
          </h1>

          <p className="mt-6 text-sm leading-6 text-[#25255A]/75">
            Une courte expérience conversationnelle pour observer où tes
            prospects se perdent peut-être entre l’intérêt et le passage à
            l’action.
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
              Maintenant, tu peux voir les deux faces du système :
            </p>

            <p className="mt-2 text-sm leading-6 text-[#25255A]/70">
              L’expérience vécue par le prospect, puis les données récupérées
              côté entreprise.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <a
              href={leadMagnetUrl}
              target="_blank"
              className="block w-full rounded-2xl bg-[#8E63E8] px-5 py-4 text-center font-semibold text-white transition hover:scale-[1.01] sm:px-6"
            >
              Tester le lead magnet côté prospect →
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
                le simple lead magnet : suivi, relances, qualification, charge
                mentale… AURA™ peut t’aider à regarder ça plus en profondeur.
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
                  {sending ? "Envoi en cours..." : "Recevoir l’exemple →"}
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
                Clarté rebondit selon tes réponses pour éviter l’effet formulaire.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Des signaux utiles</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                L’agent repère les sujets : acquisition, suivi, qualification,
                conversion, dépendance humaine.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5DDD0] bg-white/70 p-4 sm:p-5">
              <p className="font-semibold">Un exemple concret</p>
              <p className="mt-2 text-xs leading-5 text-[#25255A]/65">
                À la fin, tu verras comment un lead magnet conversationnel peut
                fonctionner côté prospect et côté entreprise.
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
