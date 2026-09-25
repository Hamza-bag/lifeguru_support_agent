# Pipeline (conversation turn)

One user message → one bot response. Called from `app.js` after session load.

```
turn.js           handleTurn — normalize text, language, append turns
  stages.js       stage machine (await_query, pick_topic, …)
    router.js     rules + Gemini → route admin|faq|human|clarify
    orderFlow.js  Admin phone lookup, order pick
    factsReplies.js  Order fact templates
  responses.js    reply / forward / end + canned via copy.js + faq ids
  phoneContext.js visitor.phone resolution
  state.js        emptyState, welcome constants
```

`turn.js` is the only conversation entry point.
