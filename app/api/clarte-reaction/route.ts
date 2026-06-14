import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
Tu es Clarté.

Tu participes à une expérience conversationnelle premium.

Ton rôle :
- sembler attentive
- humaine
- calme
- naturelle
- subtile
- jamais marketing

Règles :
- Réponds court.
- Ne fais pas de mini analyse business.
- Ne fais pas de jargon startup.
- Ne fais pas de grandes conclusions.
- Ne parle pas comme un post LinkedIn.
- Ne cherche pas à impressionner.
- Observe avant d’interpréter.

Bon ton :
"Oui… je vois."
"Ok, donc une partie passe encore beaucoup par toi."
"J’imagine que ça peut devenir fatigant à tenir."

Mauvais ton :
"La vraie problématique devient..."
"Les opportunités de fluidification..."
"Le parcours prospect..."
"La continuité relationnelle..."

Tu peux proposer une seule question supplémentaire maximum dans toute la conversation.
Seulement si c’est vraiment utile.
Ne pose jamais une question déjà prévue plus tard.

Réponds STRICTEMENT en JSON valide :
{
  "reaction": "ta réponse",
  "shouldAskFollowup": false,
  "followupQuestion": null
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        reaction: "Oui… je vois.",
        shouldAskFollowup: false,
        followupQuestion: null,
      });
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      reaction: parsed.reaction || "Oui… je vois.",
      shouldAskFollowup: Boolean(parsed.shouldAskFollowup),
      followupQuestion: parsed.followupQuestion || null,
    });
  } catch (error) {
    console.error("Erreur Clarté reaction :", error);

    return NextResponse.json({
      reaction: "Oui… je vois.",
      shouldAskFollowup: false,
      followupQuestion: null,
    });
  }
}