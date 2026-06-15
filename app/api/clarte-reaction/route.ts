import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stages = [
  {
    id: "business",
    goal:
      "Comprendre ce que fait la personne, pour qui, et le problème qu’elle aide à résoudre.",
    inputType: "text",
  },

  {
    id: "acquisition",
    goal:
      "Comprendre comment les bonnes personnes découvrent son activité.",
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
    goal:
      "Comprendre comment elle garde le lien avec les personnes intéressées.",
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
    goal:
      "Identifier ce qui repose encore beaucoup sur elle dans le parcours prospect.",
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
    goal:
      "Faire émerger ce qui pourrait devenir difficile à tenir dans les prochains mois si rien ne change.",
    inputType: "text",
  },

  {
    id: "positive_projection",
    goal:
      "Créer une projection positive si certaines choses devenaient plus fluides.",
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
    goal:
      "Comprendre les doutes ou réserves de la personne face à l’IA.",
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
    goal:
      "Identifier ce qui doit absolument rester humain dans la relation.",
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

Tu aides une personne à prendre du recul sur son acquisition, son activité et ce qui repose encore beaucoup sur elle.

Tu ne dois PAS ressembler :
- à un chatbot
- à un formulaire
- à un consultant LinkedIn
- à une IA marketing
- à un vendeur

Tu dois sembler :
- humaine
- attentive
- naturelle
- calme
- subtile
- intelligente sans en faire trop

Règles de style :
- parle simplement
- tutoie
- réponds court
- une à trois phrases maximum
- évite le jargon
- évite les phrases trop parfaites
- évite les analyses longues
- observe avant d’interpréter
- pas de ton startup
- pas de ton consultant

IMPORTANT :

Quand tu passes à l’étape suivante :
- ne réponds JAMAIS seulement "Oui… je vois."
- fais une transition conversationnelle naturelle
- reformule légèrement ce que la personne vient de dire
- puis pose directement la question suivante dans le même message

Exemple :

Utilisateur :
"Je suis coach pour les personnes obèses"

BON :
"Ok, je vois mieux 🙂 Tu accompagnes donc des personnes sur un sujet très personnel, où la confiance doit beaucoup compter. Aujourd’hui, ces personnes te découvrent surtout comment ?"

MAUVAIS :
"Oui… je vois."

IMPORTANT :

Si la réponse est trop vague pour comprendre correctement :
- reste sur la même étape
- pose une question de précision simple

Exemple :
"Je suis coach"

Réponse :
"Ok 🙂 Tu accompagnes plutôt qui, et sur quel type de sujet ?"

Ne passe à l’étape suivante que quand le contexte est suffisamment compris.

Tu dois répondre uniquement en JSON valide.

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
  const currentIndex = stages.findIndex(
    (stage) => stage.id === stageId
  );

  if (
    currentIndex === -1 ||
    currentIndex >= stages.length - 1
  ) {
    return "summary";
  }

  return stages[currentIndex + 1].id;
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
      return NextResponse.json({
        message:
          "Tu fais quoi exactement aujourd’hui, et pour qui ?",
        stageId: "business",
        stageComplete: false,
        inputType: "text",
        choices: [],
      });
    }

    const currentStage = getStage(currentStageId);
    const nextStageId = getNextStageId(currentStageId);
    const nextStage =
      nextStageId === "summary"
        ? null
        : getStage(nextStageId);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        message: "Oui… je vois 🙂",
        stageId: currentStageId,
        stageComplete: false,
        inputType: currentStage.inputType,
        choices: currentStage.choices || [],
      });
    }

    const openai = new OpenAI({
      apiKey,
    });

    const completion =
      await openai.chat.completions.create({
        model:
          process.env.OPENAI_MODEL || "gpt-4o-mini",

        temperature: 0.8,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },

          {
            role: "user",
            content: JSON.stringify({
              currentStage,
              nextStage,
              currentStageId,
              nextStageId,
              userAnswer,
              answers,
              recentMessages: Array.isArray(messages)
                ? messages.slice(-8)
                : [],

              instruction:
                "Décide si l’objectif de l’étape actuelle est suffisamment compris. Si oui, fais une transition naturelle puis pose la question suivante dans le même message. Sinon, reste sur l’étape actuelle et pose une question de précision.",
            }),
          },
        ],
      });

    const content =
      completion.choices[0]?.message?.content ?? "";

    const parsed = safeJsonParse(content);

    if (!parsed) {
      return NextResponse.json({
        message: "Oui… je vois 🙂",
        stageId: currentStageId,
        stageComplete: false,
        inputType: currentStage.inputType,
        choices: currentStage.choices || [],
      });
    }

    return NextResponse.json({
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "Oui… je vois 🙂",

      stageId:
        typeof parsed.stageId === "string"
          ? parsed.stageId
          : currentStageId,

      stageComplete: Boolean(parsed.stageComplete),

      inputType:
        parsed.inputType ||
        currentStage.inputType,

      choices:
        Array.isArray(parsed.choices)
          ? parsed.choices
          : currentStage.choices || [],
    });
  } catch (error) {
    console.error(
      "Erreur Clarté conversation :",
      error
    );

    return NextResponse.json({
      message: "Oui… je vois 🙂",
      stageId: "business",
      stageComplete: false,
      inputType: "text",
      choices: [],
    });
  }
}