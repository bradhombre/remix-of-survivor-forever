

## Fix: JeffBot conversation context for follow-up questions

**Problem**: When a user asks JeffBot a follow-up question, JeffBot has no memory of the conversation. The edge function only receives the single current question with no prior chat history.

**Solution**: Send recent chat history (both user messages and JeffBot responses) to the edge function so it can include them as conversation context in the AI prompt.

### Changes

**1. `src/hooks/useChatMessages.ts` - Send chat history with JeffBot requests**

In the `sendMessage` callback, when a `@jeffbot` query is detected, gather the last ~10 messages from the current `messages` state and pass them to the edge function as `history`.

```typescript
if (isJeffBotQuery) {
  setIsJeffBotTyping(true);
  const question = trimmedContent.slice(8).trim();
  
  // Gather recent messages for context (last 10)
  const recentHistory = messages.slice(-10).map(m => ({
    role: m.is_bot ? "assistant" : "user",
    name: m.user_display_name || "user",
    content: m.content,
  }));

  const { error: funcError } = await supabase.functions.invoke("jeffbot", {
    body: { league_id: leagueId, user_id: userId, question, history: recentHistory },
  });
  // ...
}
```

**2. `supabase/functions/jeffbot/index.ts` - Use chat history in AI call**

Accept the `history` array from the request body and include it as prior messages in the AI conversation, between the system prompt and the new user question.

```typescript
const { league_id, user_id, question, history } = await req.json();

// Build messages array with history
const aiMessages = [
  { role: "system", content: systemPrompt },
];

// Add recent chat history for context
if (Array.isArray(history)) {
  for (const msg of history.slice(-10)) {
    aiMessages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    });
  }
}

// Add current question
aiMessages.push({ role: "user", content: question });

// Use aiMessages in the API call instead of the hardcoded two-message array
```

This gives JeffBot context from the last ~10 messages so it can handle follow-ups like "Who else was on that season?" or "Tell me more about them."
