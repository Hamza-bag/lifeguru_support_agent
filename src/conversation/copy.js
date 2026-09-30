const COPY = {
  en: {
    askLanguage:
      'Welcome to LifeGuru support. Which language do you prefer?',
    languageSuggestions: ['English', 'Hindi'],
    welcomeQuery:
      'Namaste! Welcome to LifeGuru support 🙏 Ask us anything about your Mandir Puja or Chadhava booking — schedule, video, prasad, or refund.',
    thanksAck:
      "You're welcome. If you need anything about your LifeGuru booking, just type your question here.",
    askQuery:
      "Please type your question about your booking (puja time, video, prasad, etc.).",
    pickTopic:
      'What would you like to know? Choose one or type your question.',
    greetIdentify:
      "I'll help in English. Please share the 10-digit phone number you used to book on LifeGuru.",
    noBookingOnChat:
      "I couldn't find a LifeGuru booking for this WhatsApp number.",
    askBookingNumber:
      'Which mobile number did you use to book? Share it here — our team will verify and help you.',
    forwardAfterBookingNumber:
      'Thanks. Connecting you to the team with your message.',
    identifySuggestions: ['Human agent'],
    noMatch:
      "I couldn't find a LifeGuru booking for that number. Please check the number used at checkout ({attempt}/2).",
    noMatchFinal:
      "I still couldn't find a booking for that number. Connecting you to the team.",
    confirmName: 'I found an account for {name}. Looking up bookings…',
    listOrders:
      'I can see these bookings:\n{list}\nReply with the number of the booking you need help with.',
    pickPrompt: 'Reply 1, 2, … or type "human agent" to talk to the team.',
    factsPuja: 'Your {product} is scheduled for {when}. Current status: {status}.',
    factsPujaUnknown: 'I have {product} (status: {status}), but no puja time is set yet.',
    factsVideoReady:
      'The video for {product} is ready. It should already be on WhatsApp from {{PUJA_UPDATES_SENDER}}, or on your order page in the app.',
    factsVideoReadyWithLink:
      'The video for {product} is ready. Open: {link}\nYou may also have it on WhatsApp from {{PUJA_UPDATES_SENDER}} or in the app: https://lifeguru.app/profile',
    factsVideoPending:
      'The video for {product} is not published yet. It is usually shared on WhatsApp within 3–4 days after the puja. If you need urgent help, I can connect you to the team.',
    factsLiveIncluded:
      'Your {product} booking includes Live Puja. The link is sent on your registered WhatsApp when the puja starts. This chat does not have that link, and I will not guess a live URL.',
    factsLiveNotIncluded:
      'Your {product} booking does not include Live Puja. I only know that from this order, not from the puja name. The puja is still performed in your name and gotra, and the recorded video is shared within 3–4 days.',
    factsPujaGuideFallback:
      'Namaste 🙏 Do\'s, Don\'ts and mantras for your specific puja are on your order page in the app (Profile → booking). We also send a PDF on WhatsApp when scheduled — save our LifeGuru Puja Updates WhatsApp sender. Open: https://lifeguru.app/profile',
    factsNoPrasad: 'This booking does not include home prasad delivery.',
    factsPrasadNotOnOrderAddons:
      'This booking does not include home prasad delivery for {product}. You did add: {addons} — those are puja add-ons, not the Prasad box shipped to your address. For general Prasad policy, ask anytime; for changes say “human agent”.',
    factsPrasadLineNotHomeDelivery:
      'For {product} you have Prasad add-on line item(s): {prasadItems}. That is not the same as selecting home Prasad delivery (shipped box) — there is no home-delivery tracking for this order unless home Prasad was selected at checkout. Say “human agent” if you expected a shipped box.',
    factsPrasadLineAndAddonsNoHome:
      'For {product}: home Prasad delivery is not on this order. Line items — Prasad SKU: {prasadItems}; other add-ons: {addons}. Only home Prasad (Yes at checkout) gets box tracking. Say “human agent” to confirm your booking.',
    factsPrasadPending:
      'Prasad for {product} is being prepared (status: pending). We will share tracking when it is dispatched.',
    factsPrasadDispatched:
      'Prasad for {product} has been dispatched.{tracking}',
    factsPrasadDelivered: 'Prasad for {product} is marked delivered.',
    factsPrasadCancelled: 'Prasad delivery for {product} is cancelled. The team can explain details.',
    bothFacts: '{puja}\n{video}',
    clarifyIntent:
      'Are you asking about puja time, video, or prasad delivery for your booking? Please say which.',
    askMore: 'Is there anything else I can help with?',
    whatElse:
      'What else do you need — puja time, video, another booking, or the team?',
    askMoreAgain:
      'Please reply Yes or No. You can also ask about puja time or the video, or talk to the team.',
    afterAnswer:
      'Anything else about this booking? You can ask about puja time or the video, pick another booking, or talk to the team.',
    answerSuggestions: ['Puja time', 'Video', 'Human agent'],
    onlyOrder:
      'I found one booking: {title} ({bookedOn}).',
    unknownIntent:
      'For this booking I can share puja timing and video status. For anything else I can connect you to the team.',
    forward: 'Connecting you to a LifeGuru team member.',
    forwardEmpathetic:
      "I'm sorry you're going through a difficult time. I can't promise sales or payment outcomes here, but I'm connecting you to the LifeGuru team so someone can listen and help properly.",
    handoffFailureAgentBusy:
      'Our team is not available on chat right now. Your message is noted — a LifeGuru agent will follow up as soon as possible.',
    goodbye:
      'Glad I could help. This chat is now closed. Message us again anytime.',
    invalidPick: 'Please reply with a number from the list, or say "human agent".',
    error:
      'Something went wrong while looking up your booking. Connecting you to the team.',
  },
  hi: {
    askLanguage:
      'लाइफगुरु सपोर्ट में आपका स्वागत है। आप किस भाषा में बात करना चाहेंगे?',
    languageSuggestions: ['English', 'Hindi'],
    welcomeQuery:
      'नमस्ते! लाइफगुरु सपोर्ट में आपका स्वागत है 🙏 पूजा समय, वीडियो, प्रसाद, रिफंड — जो भी सवाल हो, यहाँ लिखें।',
    thanksAck:
      'आपका स्वागत है। लाइफगुरु बुकिंग से जुड़ा कोई भी सवाल यहाँ लिखें — हम मदद करेंगे।',
    askQuery:
      'कृपया अपना सवाल लिखें — पूजा समय, वीडियो, प्रसाद, आदि।',
    pickTopic:
      'आप क्या जानना चाहते हैं? एक विकल्प चुनें या सवाल लिखें।',
    greetIdentify:
      'ठीक है, आगे हिंदी में मदद करूँगा। कृपया वह 10 अंकों का मोबाइल नंबर भेजें जिससे आपने लाइफगुरु पर बुकिंग की थी।',
    noBookingOnChat:
      'इस व्हाट्सऐप नंबर पर कोई लाइफगुरु बुकिंग नहीं मिली।',
    askBookingNumber:
      'आपने किस मोबाइल नंबर से बुकिंग की थी? यहाँ भेजें — टीम जाँच कर मदद करेगी।',
    forwardAfterBookingNumber:
      'धन्यवाद। आपको टीम से जोड़ रहा हूँ।',
    identifySuggestions: ['एजेंट'],
    noMatch:
      'इस नंबर पर कोई बुकिंग नहीं मिली। चेकआउट पर इस्तेमाल किया नंबर जाँचें ({attempt}/2)।',
    noMatchFinal:
      'इस नंबर पर अभी भी बुकिंग नहीं मिली। आपको टीम से जोड़ रहा हूँ।',
    confirmName: '{name} के नाम से अकाउंट मिला। बुकिंग देख रहा हूँ…',
    listOrders:
      'ये बुकिंग दिख रही हैं:\n{list}\nजिस बुकिंग में मदद चाहिए, उसका नंबर भेजें।',
    pickPrompt: '1, 2, … भेजें, या टीम से बात के लिए "एजेंट" लिखें।',
    factsPuja: 'आपकी {product} {when} पर निर्धारित है। स्थिति: {status}।',
    factsPujaUnknown: '{product} मिली है (स्थिति: {status}), लेकिन पूजा का समय अभी सेट नहीं है।',
    factsVideoReady:
      '{product} का वीडियो तैयार है। यह व्हाट्सऐप पर आ चुका होना चाहिए, या ऐप में ऑर्डर पेज पर उपलब्ध है।',
    factsVideoReadyWithLink:
      '{product} का वीडियो तैयार है। लिंक: {link}\nWhatsApp ({{PUJA_UPDATES_SENDER}}) या ऐप: https://lifeguru.app/profile',
    factsVideoPending:
      '{product} का वीडियो अभी पब्लिश नहीं हुआ है। पूजा के 3–4 दिन बाद आमतौर पर व्हाट्सऐप पर भेजा जाता है। जरूरी हो तो टीम से जोड़ सकता हूँ।',
    factsLiveIncluded:
      'Aapki {product} booking mein Live Puja shamil hai. Link puja start par registered WhatsApp par aata hai. Is chat mein woh link nahi hai, aur main koi live URL guess nahi karunga.',
    factsLiveNotIncluded:
      'Aapki {product} booking mein Live Puja shamil nahi hai. Yeh sirf is order se pata chalta hai, puja ke naam se nahi. Puja aapke naam aur gotra se hoti hai, aur recording 3–4 din mein aati hai.',
    factsPujaGuideFallback:
      'Namaste 🙏 Aapki puja ke Do\'s, Don\'ts aur mantra app ke order page par hain (Profile → booking). WhatsApp par PDF bhi bheja ja sakta hai — LifeGuru Puja Updates sender save karein. https://lifeguru.app/profile',
    factsNoPrasad: 'इस बुकिंग में होम प्रसाद डिलीवरी शामिल नहीं है।',
    factsPrasadNotOnOrderAddons:
      '{product} पर होम प्रसाद डिलीवरी नहीं है। Add-ons: {addons} — ye puja add-ons hain, ghar bheja hua Prasad box nahi. “human agent” likh sakte hain.',
    factsPrasadLineNotHomeDelivery:
      '{product}: Prasad line {prasadItems} — ye home delivery box nahi hai jab tak checkout par home Prasad select na ho. Tracking nahi milegi. “human agent” likhein agar box expect karte the.',
    factsPrasadLineAndAddonsNoHome:
      '{product}: home Prasad delivery nahi hai. Prasad SKU: {prasadItems}; add-ons: {addons}. Shipped box sirf home Prasad (Yes) par. “human agent” se confirm karein.',
    factsPrasadPending:
      '{product} का प्रसाद तैयार हो रहा है (स्थिति: pending)। डिस्पैच होने पर ट्रैकिंग साझा करेंगे।',
    factsPrasadDispatched:
      '{product} का प्रसाद रवाना हो चुका है।{tracking}',
    factsPrasadDelivered: '{product} का प्रसाद delivered मार्क है।',
    factsPrasadCancelled:
      '{product} की प्रसाद डिलीवरी रद्द है। विवरण के लिए टीम से बात करें।',
    bothFacts: '{puja}\n{video}',
    clarifyIntent:
      'क्या आप पूजा समय, वीडियो, या प्रसाद के बारे में पूछ रहे हैं? कृपया बताएँ।',
    askMore: 'क्या और कोई मदद चाहिए?',
    whatElse: 'और क्या चाहिए — पूजा का समय, वीडियो, दूसरी बुकिंग, या टीम?',
    askMoreAgain:
      'हाँ या नहीं भेजें। पूजा समय, वीडियो, या एजेंट भी लिख सकते हैं।',
    afterAnswer:
      'इस बुकिंग पर और कुछ? पूजा का समय, वीडियो, दूसरी बुकिंग, या टीम से बात।',
    answerSuggestions: ['पूजा समय', 'वीडियो', 'एजेंट'],
    onlyOrder: 'एक बुकिंग मिली: {title} ({bookedOn})।',
    unknownIntent:
      'इस बुकिंग पर मैं पूजा का समय और वीडियो की स्थिति बता सकता हूँ। बाकी के लिए टीम से जोड़ सकता हूँ।',
    forward: 'आपको लाइफगुरु टीम से जोड़ रहा हूँ।',
    forwardEmpathetic:
      'आपकी परेशानी सुनकर दुख हुआ। यहाँ से मैं बिक्री या भुगतान का वादा नहीं कर सकता, लेकिन आपको लाइफगुरु की टीम से जोड़ रहा हूँ — कोई सुनकर सही मदद करेगा।',
    handoffFailureAgentBusy:
      'अभी चैट पर कोई एजेंट उपलब्ध नहीं है। आपका संदेश दर्ज हो गया है — लाइफगुरु टीम जल्द से जल्द संपर्क करेगी।',
    goodbye: 'मदद करके खुशी हुई। यह चैट बंद हो रही है। ज़रूरत हो तो फिर लिखें।',
    invalidPick: 'लिस्ट में से नंबर भेजें, या "एजेंट" लिखें।',
    error: 'बुकिंग देखते समय समस्या हुई। आपको टीम से जोड़ रहा हूँ।',
  },
};

function t(lang, key, vars = {}) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  let text = COPY[locale][key] || COPY.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, v == null ? '' : String(v));
  }
  return text;
}

module.exports = { COPY, t };
