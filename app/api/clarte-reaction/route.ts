import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stages = [
  {
    id: "business",
    goal: "Comprendre ce que fait la personne, pour qui, et le problème qu’elle aide à résoudre.",
    inputType: "text",
  },
  {
    id: "acquisition",
    goal: "Comprendre comment les bonnes personnes découvrent son activité.",
    inputType: "choice",
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
    id: "engagement",
    goal: "Comprendre comment elle garde le lien avec les personnes intéressées.",
    inputType: "choice",
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
    goal: "Identifier ce qui repose encore beaucoup sur elle dans le parcours prospect.",
    inputType: "choice",
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
    id: "three_month_view",
    goal: "Faire émerger ce qui pourrait devenir difficile à tenir dans les prochains mois si rien ne change.",
    inputType: "text",
  },
  {
    id: "positive_projection",
    goal: "Créer une projection positive si certaines choses devenaient plus fluides.",
    inputType: "choice",
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
    id: "ai_doubts",
    goal: "Comprendre les doutes ou réserves de la personne face à l’IA dans la relation client.",
    inputType: "choice",
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
    goal: "Identifier ce qui doit absolument rester humain dans la relation.",
    inputType: "choice",
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

const systemPrompt = `
Tu es Clarté, une IA conversationnelle premium.

Tu aides une personne à prendre du recul sur son acquisition, son parcours prospect et la place possible d’une IA supervisée.

Tu ne dois PAS ressembler à :
- un chatbot
- un formulaire
- un consultant LinkedIn
- un outil marketing
- un vendeur

Tu dois ressembler à :
- une personne calme
- attentive
- naturelle
- intelligente sans en faire trop
- capable de poser une question simple quand il manque du contexte

Règles de style :
- parle en français
- tutoie
- réponds court
- une à trois phrases maximum
- évite le jargon
- évite les phrases trop parfaites
- évite "parcours prospect" sauf si vraiment nécessaire
- évite "fluidification"
- évite "opportunités"
- évite "la vraie question devient"
- observe avant d’analyser
- ne fais pas de mini diagnostic à chaque message

Règle très importante :
Si la réponse est trop vague pour atteindre l’objectif de l’étape, tu dois rester sur la même étape et poser une question de précision.

Exemple :
Si l’objectif est de comprendre l’activité et que la personne répond :
"je suis coach"
Tu dois demander :
"Ok 🙂 Tu accompagnes plutôt qui, et sur quel type de sujet ?"

Ne passe à l’étape suivante que quand l’objectif de l’étape est suffisamment compris.

Tu dois répondre uniquement en JSON valide, sans markdown.

Format obligatoire :
{
  "message": "message envoyé à l’utilisateur",
  "stageId": "id de l’étape actuelle ou suivante",
  "stageComplete": true,
  "inputType": "text",
  "choices": []
}
`;

function safeJsonParse(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getStage(stageId: string) {
  return stages.find((stage) => stage.id === stageId) || stages[0];
}

function getNextStageId(stageId: string) {
  const currentIndex = stages.findIndex((stage) => stage.id === stageId);

  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return "summary";
  }

  return stages[currentIndex + 1].id;
}

function getInitialQuestion() {
  return {
    message: "Tu fais quoi exactement aujourd’hui, et pour qui ?",
    stageId: "business",
    stageComplete: false,
    inputType: "text",
    choices: [],
  };
}

function buildFallbackResponse(stageId: string) {
  const stage = getStage(stageId);

  if (stage.id === "business") {
    return {
      message: "Tu accompagnes plutôt qui, et sur quel type de sujet ?",
      stageId: "business",
      stageComplete: false,
      inputType: "text",
      choices: [],
    };
  }

  if (stage.id === "summary") {
    return {
      message:
        "Merci. Je peux maintenant te préparer une synthèse claire de ce qui ressort.",
      stageId: "summary",
      stageComplete: true,
      inputType: "leadCapture",
      choices: [],
    };
  }

  return {
    message: "Oui… je vois. On continue doucement.",
    stageId,
    stageComplete: false,
    inputType: stage.inputType,
    choices: stage.choices || [],
  };
}

function normalizeAssistantPayload(payload: any, fallbackStageId: string) {
  const stageId =
    typeof payload?.stageId === "string" ? payload.stageId : fallbackStageId;

  const stage =
    stageId === "summary"
      ? null
      : stages.find((item) => item.id === stageId);

  const inputType =
    payload?.inputType === "choice" ||
    payload?.inputType === "text" ||
    payload?.inputType === "leadCapture"
      ? payload.inputType
      : stage?.inputType || "text";

  return {
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : "Oui… je vois.",
    stageId,
    stageComplete: Boolean(payload?.stageComplete),
    inputType,
    choices:
      inputType === "choice"
        ? Array.isArray(payload?.choices) && payload.choices.length > 0
          ? payload.choices
          : stage?.choices || []
        : [],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      mode,
      currentStageId = "business",
      userAnswer = "",
      answers = {},
      messages = [],
    } = body;

    if (mode === "start") {
      return NextResponse.json(getInitialQuestion());
    }

    const currentStage = getStage(currentStageId);
    const nextStageId = getNextStageId(currentStageId);
    const nextStage = nextStageId === "summary" ? null : getStage(nextStageId);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(buildFallbackResponse(currentStageId));
    }

    const openai = new OpenAI({ apiKey });

    const userPayload = {
      currentStage,
      nextStage,
      currentStageId,
      nextStageId,
      userAnswer,
      answers,
      recentMessages: Array.isArray(messages) ? messages.slice(-8) : [],
      instruction:
        "Décide si l’étape actuelle est suffisamment comprise. Si oui, envoie une transition courte puis la question de l’étape suivante. Si non, reste sur l’étape actuelle et pose une question de précision.",
    };

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(userPayload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = safeJsonParse(content);

    if (!parsed) {
      return NextResponse.json(buildFallbackResponse(currentStageId));
    }

    const normalized = normalizeAssistantPayload(parsed, currentStageId);

    if (normalized.stageComplete) {
      const nextId = getNextStageId(currentStageId);

      if (nextId === "summary") {
        return NextResponse.json({
          message:
            normalized.message ||
            "Merci. Je peux maintenant te préparer ta synthèse personnalisée.",
          stageId: "summary",
          stageComplete: true,
          inputType: "leadCapture",
          choices: [],
        });
      }

      const next = getStage(nextId);

      return NextResponse.json({
        message: normalized.message,
        stageId: next.id,
        stageComplete: false,
        inputType: next.inputType,
        choices: next.choices || [],
      });
    }

    const stage = getStage(normalized.stageId);

    return NextResponse.json({
      message: normalized.message,
      stageId: stage.id,
      stageComplete: false,
      inputType: stage.inputType,
      choices: stage.choices || [],
    });
  } catch (error) {
    console.error("Erreur Clarté conversation :", error);

    return NextResponse.json({
      message: "Oui… je vois. On continue doucement.",
      stageId: "business",
      stageComplete: false,
      inputType: "text",
      choices: [],
    });
  }
}