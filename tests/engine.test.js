const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { handleTurn, WELCOME_QUERY } = require('../src/pipeline/turn');
const { createFactsClient } = require('../src/orders/factsClient');
const { normalizePhoneDigits, extractPhoneCandidate } = require('../src/orders/phone');
const {
  wantsHuman,
  detectLanguage,
  detectReplyLanguage,
  topicSuggestions,
} = require('../src/conversation/intent');

const facts = createFactsClient({ mode: 'mock' });
const CHAT = '9876543210';

describe('phone', () => {
  it('strips 91 and leading 0 like admin listing', () => {
    assert.equal(normalizePhoneDigits('919876543210'), '9876543210');
    assert.equal(normalizePhoneDigits('09876543210'), '9876543210');
    assert.equal(extractPhoneCandidate('my number is 98765-43210'), '9876543210');
  });
});

describe('intent', () => {
  it('detects reply locale (Hinglish → en templates + mirror)', () => {
    const hinglish = detectReplyLanguage('meri puja kab hai video bhi nahi aaya');
    assert.equal(hinglish.locale, 'en');
    assert.equal(hinglish.mirror, true);
    assert.equal(detectLanguage('when is my puja'), 'en');
    const devanagari = detectReplyLanguage('मेरी पूजा कब है');
    assert.equal(devanagari.locale, 'hi');
    assert.equal(devanagari.mirror, true);
    const gujarati = detectReplyLanguage('મારી પૂજા ક્યારે છે');
    assert.equal(gujarati.locale, 'en');
    assert.equal(gujarati.register, 'indic_regional');
    const engGuj = detectReplyLanguage('mari puja keweare awse');
    assert.equal(engGuj.locale, 'en');
    assert.equal(engGuj.register, 'eng_gujarati');
    assert.equal(detectReplyLanguage('meri puja kab hai').register, 'hinglish_or_roman_hi');
  });

  it('detects human / refund', () => {
    assert.equal(wantsHuman('I want a refund'), true);
    assert.equal(wantsHuman('when is my puja'), false);
  });

  it('classifies puja, video, prasad', () => {
    const { classifyIntent, isOrderIntent } = require('../src/conversation/intent');
    assert.equal(classifyIntent('when is my puja'), 'puja');
    assert.equal(classifyIntent('video kab aayegi'), 'video');
    assert.equal(isOrderIntent('prasad'), true);
  });

  it('topic suggestion chips', () => {
    assert.ok(topicSuggestions('en').includes('Video'));
    assert.ok(topicSuggestions('hi').includes('वीडियो'));
  });
});

describe('conversation (query-first, chat phone lookup)', () => {
  it('welcomes without language menu', async () => {
    const { response, state } = await handleTurn(
      { text: '', isNewChat: true },
      facts,
    );
    assert.equal(state.stage, 'await_query');
    assert.equal(response.replies[0], WELCOME_QUERY);
    assert.equal(response.suggestions, undefined);
  });

  it('uses Hinglish path (en templates) for Roman Hindi queries', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'meri puja kab hai', chatPhone: CHAT },
      facts,
    ));
    assert.equal(state.language, 'en');
    assert.match(
      (await handleTurn({ state, text: '1', chatPhone: CHAT }, facts)).response.replies.join('\n'),
      /Satyanarayan|scheduled|निर्धारित/i,
    );
  });

  it('shows topic options when query is unclear', async () => {
    let { state, response } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state, response } = await handleTurn(
      { state, text: 'hello there', chatPhone: CHAT },
      facts,
    ));
    assert.equal(state.stage, 'await_query');
    assert.match(response.replies.join(' '), /help with your LifeGuru booking/i);
    assert.equal(response.suggestions, undefined);
  });

  it('greets on hello without topic menu', async () => {
    let { state, response } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state, response } = await handleTurn({ state, text: 'hi', chatPhone: CHAT }, facts));
    assert.equal(state.stage, 'await_query');
    assert.match(response.replies.join(' '), /LifeGuru booking/i);
  });

  it('thanks ack without ending chat in await_query', async () => {
    let { state, response } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state, response } = await handleTurn({ state, text: 'thanks', chatPhone: CHAT }, facts));
    assert.equal(state.stage, 'await_query');
    assert.equal(response.action, 'reply');
    assert.match(response.replies.join(' '), /welcome|booking|स्वागत/i);
  });

  it('resolves puja after picking topic chip', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn({ state, text: 'help', chatPhone: CHAT }, facts));
    ({ state } = await handleTurn(
      { state, text: 'Puja schedule', chatPhone: CHAT },
      facts,
    ));
    const picked = await handleTurn({ state, text: '1', chatPhone: CHAT }, facts);
    assert.equal(picked.state.orderId, '1001');
  });

  it('asks for booking phone when visitor phone missing (no default lookup)', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const result = await handleTurn({ state, text: 'meri puja kab hai' }, facts);
    assert.equal(result.state.stage, 'await_booking_number');
    assert.equal(result.response.action, 'reply');
    assert.match(result.response.replies.join(' '), /10-digit|10 अंकों/i);
    const handoff = await handleTurn(
      { state: result.state, text: '9876543210' },
      facts,
    );
    assert.equal(handoff.response.action, 'forward');
    assert.equal(handoff.state.stage, 'await_query');
  });

  it('forwards autopay and call requests without FAQ or Admin', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const autopay = await handleTurn(
      { state, text: 'stop autopay money deducted', chatPhone: CHAT },
      facts,
    );
    assert.equal(autopay.response.action, 'forward');
    const call = await handleTurn(
      { state, text: 'How can I call you', chatPhone: CHAT },
      facts,
    );
    assert.equal(call.response.action, 'forward');
  });

  it('forwards image webhook without text', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const img = await handleTurn(
      {
        state,
        text: '',
        chatPhone: CHAT,
        salesIqPayload: { message: { type: 'image', url: 'https://example.com/x.jpg' } },
      },
      facts,
    );
    assert.equal(img.response.action, 'forward');
  });

  it('forwards refund without topic menu', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const result = await handleTurn(
      { state, text: 'I want a refund', chatPhone: CHAT },
      facts,
    );
    assert.equal(result.response.action, 'forward');
  });

  it('no booking on chat number → ask booking number → forward', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'when is my video', chatPhone: '1111111111' },
      facts,
    ));
    assert.equal(state.stage, 'await_booking_number');
    const handoff = await handleTurn(
      { state, text: '9876500000', chatPhone: '1111111111' },
      facts,
    );
    assert.equal(handoff.response.action, 'forward');
    assert.equal(handoff.state.stage, 'await_query');
  });

  it('closes after no more help', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'puja time', chatPhone: CHAT },
      facts,
    ));
    ({ state } = await handleTurn({ state, text: '1', chatPhone: CHAT }, facts));
    const ended = await handleTurn({ state, text: 'no' }, facts);
    assert.equal(ended.response.action, 'end');
  });
});
