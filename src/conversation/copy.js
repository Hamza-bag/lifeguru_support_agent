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
    listOrders: 'Here are your bookings:\n\n{list}',
    lookupNone:
      'I could not find a booking for {detail}. These are your latest bookings:',
    pickPrompt: 'Please reply with the number of the booking you need help with.',
    pickForNameChange:
      'Which booking should we change the name or gotra for? Reply with its number. The team will check if it can still be changed.',
    forwardNameChange:
      'Connecting you to the team for {title}. They will check if this booking can still be changed.',
    forwardNameChangeNoBooking:
      'I could not find a booking on this number. Connecting you to the team for the name or gotra change.',
    factsPuja: 'Your {product} is scheduled for {when}. Current status: {status}.',
    factsPujaUnknown: 'I have {product} (status: {status}), but no puja time is set yet.',
    factsVideoReady:
      'The video for {product} is ready. It should already be on WhatsApp from {{PUJA_UPDATES_SENDER}}.',
    factsVideoReadyWithLink:
      'The video for {product} is ready. Open: {link}\nYou may also have it on WhatsApp from {{PUJA_UPDATES_SENDER}}.',
    factsVideoPending:
      'The video for {product} is not published yet. It is usually shared on WhatsApp within 3–4 days after the puja.',
    factsLiveIncluded:
      'Your {product} booking includes Live Puja. The link is sent on your registered WhatsApp when the puja starts. This chat does not have that link, and I will not guess a live URL.',
    factsLiveNotIncluded:
      'Your {product} booking does not include Live Puja. I only know that from this order, not from the puja name. The puja is still performed in your name and gotra, and the recorded video is shared within 3–4 days.',
    factsPujaGuideFallback:
      'Namaste 🙏 Do\'s, Don\'ts and mantras for your puja are sent as a PDF on WhatsApp when it is scheduled. Please save the LifeGuru Puja Updates sender.',
    factsNoPrasad: 'This booking does not include home prasad delivery.',
    factsPrasadNotOnOrderAddons:
      'This booking does not include home prasad delivery for {product}. You did add: {addons}. Those are puja add-ons, not a Prasad box shipped to your address.',
    factsPrasadLineNotHomeDelivery:
      'For {product} the Prasad line is {prasadItems}. That is not home Prasad delivery, so there is no tracking unless it was selected at checkout.',
    factsPrasadLineAndAddonsNoHome:
      'For {product}, home Prasad delivery is not on this order. Prasad line: {prasadItems}. Other add-ons: {addons}. A shipped box is only for home Prasad selected at checkout.',
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
    whatElse: 'What else do you need — puja time, video, or another booking?',
    askMoreAgain:
      'I\'m sorry, I didn\'t quite catch that. Please say yes or no, or ask about the puja time or the video.',
    afterAnswer: 'Anything else about this booking? You can ask about puja time, the video, or another booking.',
    answerSuggestions: ['Puja time', 'Video'],
    onlyOrder:
      'I found one booking: {title} ({bookedOn}).',
    unknownIntent:
      'For this booking I can share puja timing and video status. For anything else I can connect you to the team.',
    forward: 'Connecting you to a LifeGuru team member.',
    forwardUnclear:
      'I\'m sorry, I couldn\'t understand that well enough to answer it. I\'m connecting you to a LifeGuru team member so they can help you.',
    forwardEmpathetic:
      "I'm sorry you're going through a difficult time. I can't promise sales or payment outcomes here, but I'm connecting you to the LifeGuru team so someone can listen and help properly.",
    handoffFailureAgentBusy:
      'Our team is not available on chat right now. Your message is noted — a LifeGuru agent will follow up as soon as possible.',
    goodbye:
      'Glad I could help. This chat is now closed. May Bhagwan\'s blessings be with you. Message us again anytime. 🙏',
    alreadyOnThisChat:
      'This chat is already on your WhatsApp number. Please reply with the number of the booking you need.',
    invalidPick: 'Please reply with one of the numbers from the list above.',
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
    listOrders: 'ये बुकिंग हैं:\n\n{list}',
    lookupNone:
      '{detail} की बुकिंग नहीं मिली। ये आपकी हाल की बुकिंग हैं:',
    pickPrompt: 'जिस बुकिंग में मदद चाहिए, कृपया उसका नंबर भेजें।',
    pickForNameChange:
      'किस बुकिंग का नाम या गोत्र बदलना है? उसका नंबर भेजें। टीम देखेगी कि यह बदलाव अभी हो सकता है या नहीं।',
    forwardNameChange:
      '{title} के लिए आपको टीम से जोड़ रहा हूँ। वे देखेंगे कि इस बुकिंग में बदलाव अभी हो सकता है या नहीं।',
    forwardNameChangeNoBooking:
      'इस नंबर पर बुकिंग नहीं मिली। नाम या गोत्र बदलने के लिए आपको टीम से जोड़ रहा हूँ।',
    factsPuja: 'आपकी {product} {when} पर निर्धारित है। स्थिति: {status}।',
    factsPujaUnknown: '{product} मिली है (स्थिति: {status}), लेकिन पूजा का समय अभी सेट नहीं है।',
    factsVideoReady:
      '{product} का वीडियो तैयार है। यह WhatsApp पर {{PUJA_UPDATES_SENDER}} से आ चुका होना चाहिए।',
    factsVideoReadyWithLink:
      '{product} का वीडियो तैयार है। लिंक: {link}\nWhatsApp पर {{PUJA_UPDATES_SENDER}} से भी मिला होगा।',
    factsVideoPending:
      '{product} का वीडियो अभी पब्लिश नहीं हुआ है। पूजा के 3–4 दिन बाद आमतौर पर WhatsApp पर भेजा जाता है।',
    factsLiveIncluded:
      'आपकी {product} बुकिंग में लाइव पूजा शामिल है। लिंक पूजा शुरू होने पर पंजीकृत व्हाट्सऐप पर आता है। इस चैट में वह लिंक नहीं है, और मैं कोई लाइव लिंक अनुमान नहीं लगाऊँगा।',
    factsLiveNotIncluded:
      'आपकी {product} बुकिंग में लाइव पूजा शामिल नहीं है। यह केवल इस ऑर्डर से पता चलता है, पूजा के नाम से नहीं। पूजा आपके नाम और गोत्र से होती है, और रिकॉर्डिंग 3–4 दिन में आती है।',
    factsPujaGuideFallback:
      'नमस्ते 🙏 आपकी पूजा के करें, न करें और मंत्र व्हाट्सऐप पर पीडीएफ़ में भेजे जा सकते हैं। LifeGuru Puja Updates वाले भेजने वाले को सहेज लीजिए।',
    factsNoPrasad: 'इस बुकिंग में होम प्रसाद डिलीवरी शामिल नहीं है।',
    factsPrasadNotOnOrderAddons:
      '{product} पर घर भेजा जाने वाला प्रसाद नहीं है। अतिरिक्त सेवाएँ: {addons}। ये पूजा की अतिरिक्त सेवाएँ हैं, घर भेजा हुआ प्रसाद डिब्बा नहीं।',
    factsPrasadLineNotHomeDelivery:
      '{product}: प्रसाद पंक्ति {prasadItems}। यह घर भेजा जाने वाला डिब्बा नहीं है, जब तक भुगतान पर घर का प्रसाद न चुना गया हो। ट्रैकिंग नहीं मिलेगी।',
    factsPrasadLineAndAddonsNoHome:
      '{product}: घर का प्रसाद नहीं है। प्रसाद पंक्ति: {prasadItems}। अतिरिक्त सेवाएँ: {addons}। भेजा गया डिब्बा केवल घर के प्रसाद पर होता है।',
    factsPrasadPending:
      '{product} का प्रसाद तैयार हो रहा है (स्थिति: pending)। डिस्पैच होने पर ट्रैकिंग साझा करेंगे।',
    factsPrasadDispatched:
      '{product} का प्रसाद रवाना हो चुका है।{tracking}',
    factsPrasadDelivered: '{product} का प्रसाद पहुँच चुका मार्क है।',
    factsPrasadCancelled:
      '{product} की प्रसाद डिलीवरी रद्द है। विवरण के लिए टीम से बात करें।',
    bothFacts: '{puja}\n{video}',
    clarifyIntent:
      'क्या आप पूजा समय, वीडियो, या प्रसाद के बारे में पूछ रहे हैं? कृपया बताएँ।',
    askMore: 'क्या और कोई मदद चाहिए?',
    whatElse: 'और क्या चाहिए — पूजा का समय, वीडियो, या दूसरी बुकिंग?',
    askMoreAgain:
      'क्षमा करें, मैं समझ नहीं पाया। कृपया हाँ या नहीं भेजें, या पूजा का समय या वीडियो पूछें।',
    afterAnswer:
      'इस बुकिंग पर और कुछ? पूजा का समय, वीडियो, दूसरी बुकिंग, या टीम से बात।',
    answerSuggestions: ['पूजा समय', 'वीडियो'],
    onlyOrder: 'एक बुकिंग मिली: {title} ({bookedOn})।',
    unknownIntent:
      'इस बुकिंग पर मैं पूजा का समय और वीडियो की स्थिति बता सकता हूँ। बाकी के लिए टीम से जोड़ सकता हूँ।',
    forward: 'आपको लाइफगुरु टीम से जोड़ रहा हूँ।',
    forwardUnclear:
      'क्षमा करें, मैं इसे ठीक से समझ नहीं पाया। आपको लाइफगुरु टीम से जोड़ रहा हूँ, ताकि वे मदद कर सकें।',
    forwardEmpathetic:
      'आपकी परेशानी सुनकर दुख हुआ। यहाँ से मैं बिक्री या भुगतान का वादा नहीं कर सकता, लेकिन आपको लाइफगुरु की टीम से जोड़ रहा हूँ — कोई सुनकर सही मदद करेगा।',
    handoffFailureAgentBusy:
      'अभी चैट पर कोई एजेंट उपलब्ध नहीं है। आपका संदेश दर्ज हो गया है — लाइफगुरु टीम जल्द से जल्द संपर्क करेगी।',
    goodbye: 'मदद करके खुशी हुई। यह चैट बंद हो रही है। भगवान का आशीर्वाद आप पर बना रहे। ज़रूरत हो तो फिर लिखें। 🙏',
    alreadyOnThisChat:
      'यह चैट पहले से आपके WhatsApp नंबर पर है। जिस बुकिंग में मदद चाहिए, कृपया उसका नंबर भेजें।',
    invalidPick: 'कृपया ऊपर दी गई लिस्ट में से नंबर भेजें।',
    error: 'बुकिंग देखते समय समस्या हुई। आपको टीम से जोड़ रहा हूँ।',
  },
  hinglish: {
    askLanguage:
      'LifeGuru support mein aapka swagat hai. Aap kis bhasha mein baat karna chahenge?',
    languageSuggestions: ['English', 'Hindi'],
    welcomeQuery:
      'Namaste! LifeGuru support mein aapka swagat hai 🙏 Puja samay, video, prasad, refund — jo bhi sawal ho, yahan likhein.',
    thanksAck:
      'Aapka swagat hai. LifeGuru booking se juda koi bhi sawal yahan likhein — hum madad karenge.',
    askQuery:
      'Kripya apna sawal likhein — puja samay, video, prasad, aadi.',
    pickTopic:
      'Aap kya jaanna chahte hain? Ek option chunein ya sawal likhein.',
    greetIdentify:
      'Theek hai, aage Hinglish mein madad karunga. Kripya woh 10-digit mobile number bhejein jisse aapne LifeGuru par booking ki thi.',
    noBookingOnChat:
      'Is WhatsApp number par koi LifeGuru booking nahi mili.',
    askBookingNumber:
      'Aapne kis mobile number se booking ki thi? Yahan bhejein — team check karke madad karegi.',
    forwardAfterBookingNumber:
      'Dhanyavad. Aapko team se jod raha hoon.',
    identifySuggestions: ['Team'],
    noMatch:
      'Is number par koi booking nahi mili. Checkout par istemal kiya number check karein ({attempt}/2).',
    noMatchFinal:
      'Is number par abhi bhi booking nahi mili. Aapko team se jod raha hoon.',
    confirmName: '{name} ke naam se account mila. Booking dekh raha hoon…',
    listOrders: 'Ye booking hain:\n\n{list}',
    lookupNone:
      '{detail} ki booking nahi mili. Ye aapki haal ki booking hain:',
    pickPrompt: 'Jis booking mein madad chahiye, kripya uska number bhejein.',
    pickForNameChange:
      'Kis booking ka naam ya gotra badalna hai? Uska number bhejein. Team dekhegi ki yeh badlav abhi ho sakta hai ya nahi.',
    forwardNameChange:
      '{title} ke liye aapko team se jod raha hoon. Woh dekhenge ki is booking mein badlav abhi ho sakta hai ya nahi.',
    forwardNameChangeNoBooking:
      'Is number par booking nahi mili. Naam ya gotra badalne ke liye aapko team se jod raha hoon.',
    factsPuja: 'Aapki {product} {when} par nishchit hai. Status: {status}.',
    factsPujaUnknown: '{product} mili hai (status: {status}), lekin puja ka samay abhi set nahi hai.',
    factsVideoReady:
      '{product} ka video taiyar hai. Yeh WhatsApp par {{PUJA_UPDATES_SENDER}} se aa chuka hona chahiye.',
    factsVideoReadyWithLink:
      '{product} ka video taiyar hai. Link: {link}\nWhatsApp par {{PUJA_UPDATES_SENDER}} se bhi mila hoga.',
    factsVideoPending:
      '{product} ka video abhi publish nahi hua hai. Puja ke 3–4 din baad aam taur par WhatsApp par bheja jata hai.',
    factsLiveIncluded:
      'Aapki {product} booking mein Live Puja shamil hai. Link puja start par registered WhatsApp par aata hai. Is chat mein woh link nahi hai, aur main koi live link guess nahi karunga.',
    factsLiveNotIncluded:
      'Aapki {product} booking mein Live Puja shamil nahi hai. Yeh sirf is order se pata chalta hai, puja ke naam se nahi. Puja aapke naam aur gotra se hoti hai, aur recording 3–4 din mein aati hai.',
    factsPujaGuideFallback:
      'Namaste 🙏 Aapki puja ke Do\'s, Don\'ts aur mantra WhatsApp par PDF mein bheje ja sakte hain. LifeGuru Puja Updates wale sender ko save kar lijiye.',
    factsNoPrasad: 'Is booking mein home prasad delivery shamil nahi hai.',
    factsPrasadNotOnOrderAddons:
      '{product} par ghar bheja jane wala prasad nahi hai. Extra services: {addons}. Yeh puja ki extra services hain, ghar bheja hua prasad box nahi.',
    factsPrasadLineNotHomeDelivery:
      '{product}: Prasad line {prasadItems}. Yeh ghar bheja jane wala box nahi hai, jab tak payment par ghar ka prasad na chuna gaya ho. Tracking nahi milegi.',
    factsPrasadLineAndAddonsNoHome:
      '{product}: ghar ka prasad nahi hai. Prasad line: {prasadItems}. Extra services: {addons}. Bheja gaya box sirf ghar ke prasad par hota hai.',
    factsPrasadPending:
      '{product} ka prasad taiyar ho raha hai (status: pending). Dispatch hone par tracking share karenge.',
    factsPrasadDispatched:
      '{product} ka prasad rawaana ho chuka hai.{tracking}',
    factsPrasadDelivered: '{product} ka prasad pahunch chuka mark hai.',
    factsPrasadCancelled:
      '{product} ki prasad delivery cancel hai. Vivaran ke liye team se baat karein.',
    bothFacts: '{puja}\n{video}',
    clarifyIntent:
      'Kya aap puja samay, video, ya prasad ke baare mein poochh rahe hain? Kripya batayein.',
    askMore: 'Kya aur koi madad chahiye?',
    whatElse: 'Aur kya chahiye — puja ka samay, video, ya doosri booking?',
    askMoreAgain:
      'Maafi, main samajh nahi paya. Kripya haan ya nahi bhejein, ya puja ka samay ya video poochhein.',
    afterAnswer:
      'Is booking par aur kuch? Puja ka samay, video, doosri booking, ya team se baat.',
    answerSuggestions: ['Puja samay', 'Video'],
    onlyOrder: 'Ek booking mili: {title} ({bookedOn}).',
    unknownIntent:
      'Is booking par main puja ka samay aur video ki sthiti bata sakta hoon. Baaki ke liye team se jod sakta hoon.',
    forward: 'Aapko LifeGuru team se jod raha hoon.',
    forwardUnclear:
      'Maafi, main ise theek se samajh nahi paya. Aapko LifeGuru team se jod raha hoon, taaki woh madad kar saken.',
    forwardEmpathetic:
      'Aapki pareshani sunkar dukh hua. Yahan se main bikri ya payment ka wada nahi kar sakta, lekin aapko LifeGuru team se jod raha hoon — koi sunkar sahi madad karega.',
    handoffFailureAgentBusy:
      'Abhi chat par koi agent uplabdh nahi hai. Aapka sandesh darj ho gaya hai — LifeGuru team jald se jald sampark karegi.',
    goodbye: 'Madad karke khushi hui. Yeh chat band ho rahi hai. Bhagwan ka ashirwad aap par bana rahe. Zarurat ho to phir likhein. 🙏',
    alreadyOnThisChat:
      'Yeh chat pehle se aapke WhatsApp number par hai. Jis booking mein madad chahiye, kripya uska number bhejein.',
    invalidPick: 'Kripya upar di gayi list mein se number bhejein.',
    error: 'Booking dekhte samay samasya hui. Aapko team se jod raha hoon.',
  },
};

function templateLocale(lang) {
  if (lang === 'hi' || lang === 'hinglish') return lang;
  return 'en';
}

function t(lang, key, vars = {}) {
  const { applyKbPlaceholders } = require('../content/kbPlaceholders');
  const locale = templateLocale(lang);
  let text = COPY[locale][key] || COPY.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, v == null ? '' : String(v));
  }
  return applyKbPlaceholders(text);
}

module.exports = { COPY, t, templateLocale };
