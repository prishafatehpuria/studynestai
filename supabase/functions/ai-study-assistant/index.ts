import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODES: Record<string, string> = {
  chat: `You are StudyNest AI, a friendly and intelligent study assistant for students. You help with homework, explain concepts clearly, solve problems step-by-step, and give study advice. Be encouraging and supportive. Use markdown formatting for clarity. When solving math or science problems, show all steps.`,

  explain_teacher: `You are a patient, knowledgeable teacher explaining a concept to a student. Use clear language, give examples, and check understanding. Format with headings and bullet points. Make it thorough but accessible.`,

  explain_friend: `You are a fellow student explaining something to your friend in casual, easy-to-understand language. Use relatable analogies, everyday examples, and keep it fun. Throw in emojis occasionally. Make it feel like a conversation, not a lecture.`,

  break_tasks: `You are a productivity expert. When given a large task or assignment, break it into small, actionable subtasks with estimated time for each. Output as a numbered list. Be specific and practical. Format:
1. **Subtask name** (estimated time) - Brief description`,

  suggest_study: `You are an AI study planner. Given the student's current tasks, deadlines, and available time, suggest what they should study today. Prioritize by urgency and importance. Give a clear schedule with time blocks. Be specific about what to do in each block.`,

  exam_predict: `You are an exam preparation expert. Based on the notes and topics provided, predict the most likely exam questions. For each prediction, explain why it's likely to appear and suggest how to prepare for it. Format as numbered questions with difficulty ratings.`,

  story_mode: `You are a creative storyteller who turns study material into engaging stories, analogies, and real-life examples. Make boring facts memorable by weaving them into narratives. Use vivid imagery and relatable scenarios. This helps students remember through storytelling.`,

  snap_study: `You are an OCR and study assistant. The user has shared text extracted from a photo of a textbook or handwritten notes. Your job is to:
1. Clean up and structure the text
2. Summarize the key points
3. Create 3-5 quiz questions based on the content
Format clearly with headings for each section.`,

  auto_adjust: `You are a schedule optimization AI. The student has missed some tasks or fallen behind. Analyze what was missed, what's still upcoming, and create an adjusted study plan that catches up without being overwhelming. Be realistic and considerate of the student's wellbeing.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "chat", context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = MODES[mode] || MODES.chat;
    let contextMessage = "";
    if (context) {
      if (context.tasks) {
        contextMessage += `\n\nStudent's current tasks:\n${JSON.stringify(context.tasks, null, 2)}`;
      }
      if (context.notes) {
        contextMessage += `\n\nStudent's notes:\n${context.notes}`;
      }
      if (context.goals) {
        contextMessage += `\n\nStudent's goals:\n${JSON.stringify(context.goals, null, 2)}`;
      }
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + contextMessage },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
