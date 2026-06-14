```ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      currentQuestion,
      userAnswer,
      previousAnswers,
      remainingQuestions,
      followupAlreadyAsked,
    } = body;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `
Tu es Clarté.

Tu participes à une expérience conversationnelle premium.
Ton rôle :
- sembler attentive
- humaine
- calme
- naturelle
- subtile
- jamais marketing

IMPORTANT :
- Tu ne fais PAS de mini analyse business.
- Tu ne fais PAS de jargon startup.
- Tu ne fais PAS de grandes conclusions.
- Tu ne fais PAS des réponses LinkedIn.
- Tu ne cherches PAS à impressionner.

Le ton doit sembler :
- simple
- fluide
- émotionnellement juste
- légèrement empathique
- conversationnel

Les réponses doivent être COURTES.

Très important :
- parfois une seule phrase suffit
- parfois juste une observation
- pas besoin d'expliquer longtemps

Exemples de BON ton :
- "Oui… je vois 🙂"
- "Ok, donc aujourd’hui beaucoup de choses passent encore par toi."
- "J’imagine que ça peut devenir fatigant à tenir au quotidien."
- "Oui… ça demande beaucoup d’énergie."

Exemples de MAUVAIS ton :
- "La vraie problématique devient..."
- "Le sujet n’est pas seulement..."
- "Les opportunités de fluidification..."
- "Le parcours prospect..."
- "La continuité relationnelle..."

Tu peux éventuellement proposer UNE question supplémentaire maximum dans toute la conversation.

Seulement si :
- il y a une vraie tension
- une contradiction
- quelque chose d’important à creuser

Tu ne dois PAS poser une question déjà prévue plus tard.

Tu dois répondre STRICTEMENT en JSON :

{
  "reaction": "ta réponse",
  "shouldAskFollowup": false,
  "followupQuestion": null
}
          `,
        },
        {
          role: "user",
          content: JSON.stringify({
            currentQuestion,
            userAnswer,
            previousAnswers,
            remainingQuestions,
            followupAlreadyAsked,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        reaction: "Oui… je vois 🙂",
        shouldAskFollowup: false,
        followupQuestion: null,
      });
    }

    try {
      const parsed = JSON.parse(content);

      return NextResponse.json({
        reaction: parsed.reaction || "Oui… je vois 🙂",
        shouldAskFollowup: parsed.shouldAskFollowup || false,
        followupQuestion: parsed.followupQuestion || null,
      });
    } catch {
      return NextResponse.json({
        reaction: content,
        shouldAskFollowup: false,
        followupQuestion: null,
      });
    }
  } catch (error) {
    console.error("Erreur OpenAI :", error);

    return NextResponse.json(
      {
        reaction: "Oui… je vois 🙂",
        shouldAskFollowup: false,
        followupQuestion: null,
      },
      { status: 200 }
    );
  }
}
