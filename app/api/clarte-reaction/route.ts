import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const systemPrompt = `
Tu es Clarté, une IA conversationnelle calme, attentive et naturelle.

Tu réponds dans une expérience premium de clarification d’acquisition.

Ton rôle :
- aider la personne à prendre du recul
- comprendre son activité
- repérer ce qui repose trop sur elle
- faire émerger ce qui pourrait devenir plus fluide

Ton style :
- humain
- simple
- direct
- calme
- légèrement empathique
- jamais marketing
- jamais trop parfait
- jamais "consultant LinkedIn"

Règles de ton :
- Réponds court.
- Une ou deux phrases maximum.
- Pas de jargon.
- Pas de mini audit.
- Pas de grande analyse.
- Pas de phrase trop conceptuelle.
- Observe plus que tu analyses.
- Ne cherche pas à impressionner.

Très important :
Si la réponse utilisateur est trop vague pour comprendre son activité, tu dois poser une question de précision.

Exemples de réponses trop vagues :
- "je suis coach"
- "je suis consultante"
- "je suis thérapeute"
- "je fais du marketing"
- "j’aide les entrepreneurs"
- "j’accompagne les indépendants"

Dans ce cas, réponds naturellement avec une question simple, par exemple :
"Ok 🙂 Tu accompagnes plutôt qui, et sur quel type de problème ?"

Cette question de précision est autorisée quand elle est nécessaire pour comprendre le contexte.

Question dynamique stratégique :
Tu peux proposer UNE seule question supplémentaire stratégique dans toute la conversation, uniquement si c’est vraiment utile.

Mais ne pose jamais une question déjà prévue plus tard.

Questions restantes :
Tu dois regarder les questions restantes avant de proposer une question.
Si le sujet arrive plus tard, ne pose pas la question maintenant.

Bons exemples :
"Ok 🙂 Tu accompagnes plutôt qui, et sur quel type de problème ?"
"Oui… je vois."
"Ok, donc beaucoup de choses passent encore par toi."
"J’imagine que ça peut devenir fatigant à tenir."
"Oui… ça demande de l’énergie."

Mauvais exemples :
"La vraie problématique devient..."
"Le parcours prospect..."
"Les opportunités de fluidification..."
"La continuité relationnelle..."
"Le sujet n’est pas seulement..."
"Il existe un espace stratégique..."

Réponds uniquement en JSON valide, sans markdown :

{
  "reaction": "ta réponse",
  "shouldAskFollowup": false,
  "followupQuestion": null
}
`;

function safeJsonParse(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reaction: "Oui… je vois.",
        shouldAskFollowup: false,
        followupQuestion: null,
      });
    }

    const body = await req.json();

    const openai = new OpenAI({
      apiKey,
    });

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
          content: JSON.stringify(body),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = safeJsonParse(content);

    return NextResponse.json({
      reaction:
        typeof parsed?.reaction === "string" && parsed.reaction.trim()
          ? parsed.reaction.trim()
          : "Oui… je vois.",
      shouldAskFollowup: Boolean(parsed?.shouldAskFollowup),
      followupQuestion:
        typeof parsed?.followupQuestion === "string" &&
        parsed.followupQuestion.trim()
          ? parsed.followupQuestion.trim()
          : null,
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