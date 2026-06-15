import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const systemPrompt = `
Tu es Clarté, une IA conversationnelle calme et attentive.

Tu réponds dans une expérience premium de clarification d’acquisition.

Règles :
- Réponds court.
- Ton naturel, humain, simple.
- Pas de jargon.
- Pas de mini audit.
- Pas de ton consultant.
- Pas de phrases trop parfaites.
- Observe plus que tu analyses.
- Une ou deux phrases maximum.

Tu peux proposer UNE seule question supplémentaire dans toute la conversation, uniquement si c’est vraiment utile.
Ne pose jamais une question déjà prévue plus tard.

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
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
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