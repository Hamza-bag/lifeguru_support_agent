const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { handleTurn, WELCOME_QUERY } = require('../src/pipeline/turn');
const { createStubFactsClient } = require('./helpers/stubFactsClient');
const { Op } = require('sequelize');
const { normalizePhoneDigits, extractPhoneCandidate } = require('../src/orders/phone');
const { phoneEqualityValues, userPhoneWhere } = require('../src/services/supportFacts/orderListHelpers');
const {
  wantsHuman,
  isRefundOrCancelRequest,
  detectLanguage,
  detectReplyLanguage,
  topicSuggestions,
} = require('../src/conversation/intent');

const facts = createStubFactsClient();
const CHAT = '9876543210';

describe('phone', () => {
  it('strips 91 and leading 0 like admin listing', () => {
    assert.equal(normalizePhoneDigits('919876543210'), '9876543210');
    assert.equal(normalizePhoneDigits('09876543210'), '9876543210');
    assert.equal(normalizePhoneDigits('+14155551212'), '14155551212');
    assert.equal(extractPhoneCandidate('my number is 98765-43210'), '9876543210');
  });

  it('keeps the Indian phone match and adds country_code for international', () => {
    const indian = userPhoneWhere('9876543210');
    assert.equal(indian.is_delete, false);
    assert.equal(indian[Op.or], undefined);
    assert.deepEqual(indian.phone[Op.in], phoneEqualityValues('9876543210'));

    const us = userPhoneWhere('14155551212');
    const branches = us[Op.or];
    assert.equal(branches.length, 2);
    assert.deepEqual(branches[0].phone[Op.in].slice(0, 4), phoneEqualityValues('14155551212'));
    assert.equal(branches[0].phone[Op.in][4], '+14155551212');
    assert.equal(branches[1].phone, '4155551212');
    assert.deepEqual(branches[1].country_code[Op.in], ['1', '+1']);

    const uk = userPhoneWhere('447911123456');
    assert.equal(uk[Op.or][1].phone, '7911123456');
    assert.deepEqual(uk[Op.or][1].country_code[Op.in], ['44', '+44']);
  });
});

describe('intent', () => {
  it('detects reply locale (Hinglish uses the stored template)', () => {
    const hinglish = detectReplyLanguage('meri puja kab hai video bhi nahi aaya');
    assert.equal(hinglish.locale, 'hinglish');
    assert.equal(hinglish.mirror, false);
    assert.equal(detectLanguage('when is my puja'), 'en');
    const devanagari = detectReplyLanguage('मेरी पूजा कब है');
    assert.equal(devanagari.locale, 'hi');
    assert.equal(devanagari.mirror, false);
    const gujarati = detectReplyLanguage('મારી પૂજા ક્યારે છે');
    assert.equal(gujarati.locale, 'en');
    assert.equal(gujarati.register, 'other');
    assert.equal(gujarati.mirror, true);
    const otherLatin = detectReplyLanguage('mari puja keweare awse');
    assert.equal(otherLatin.register, 'other');
    assert.equal(otherLatin.mirror, true);
    assert.equal(detectReplyLanguage('meri puja kab hai').register, 'hinglish');
    const telugu = detectReplyLanguage('naa puja eppudu');
    assert.equal(telugu.register, 'other');
    assert.equal(telugu.mirror, true);
    const spanish = detectReplyLanguage('cuando esta mi reserva');
    assert.equal(spanish.register, 'other');
    assert.equal(spanish.mirror, true);
    assert.equal(detectReplyLanguage('when is my puja').register, 'en');
    assert.equal(detectReplyLanguage('I want to book puja').register, 'en');
    assert.equal(detectReplyLanguage('Last puja?').register, 'en');
    assert.equal(
      detectReplyLanguage('Meye pooja book kidi , ehno schedule batawo').register,
      'other',
    );
    assert.equal(
      detectReplyLanguage('Autopay cancel karna hai paise cut gaye').register,
      'hinglish',
    );
  });

  it('detects a person request separately from a booking refund', () => {
    assert.equal(wantsHuman('I want a refund'), false);
    assert.equal(isRefundOrCancelRequest('I want a refund'), true);
    assert.equal(isRefundOrCancelRequest('Autopay cancel karna hai paise cut gaye'), false);
    assert.equal(wantsHuman('Human'), true);
    assert.equal(wantsHuman('when is my puja'), false);
    assert.equal(wantsHuman('invoice bhejo'), true);
    assert.equal(wantsHuman('Puja par GST kyun laga hai?'), false);
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

  it('uses the stored Hinglish template for Roman Hindi queries', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'meri puja kab hai', chatPhone: CHAT },
      facts,
    ));
    assert.equal(state.language, 'hinglish');
    assert.match(
      (await handleTurn({ state, text: '1', chatPhone: CHAT }, facts)).response.replies.join('\n'),
      /Satyanarayan|scheduled|निर्धारित/i,
    );
  });

  it('re-shows the booking list when a phone is sent instead of 1, 2, or 3', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'when is my puja', chatPhone: CHAT },
      facts,
    ));
    assert.equal(state.stage, 'select_order');
    const again = await handleTurn(
      { state, text: '9826312985', chatPhone: CHAT },
      facts,
    );
    assert.equal(again.state.stage, 'select_order');
    assert.match(again.response.replies.join('\n'), /Satyanarayan/);
    assert.match(again.response.replies.join('\n'), /already on your WhatsApp/i);
  });

  it('forwards when the user says Human while choosing a booking', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'when is my puja', chatPhone: CHAT },
      facts,
    ));
    const handoff = await handleTurn({ state, text: 'Human', chatPhone: CHAT }, facts);
    assert.equal(handoff.response.action, 'forward');
  });

  it('lists bookings when the customer picks puja time', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const schedule = await handleTurn(
      { state, text: 'Puja time', chatPhone: CHAT },
      facts,
    );
    assert.equal(schedule.response.action, 'reply');
    assert.match(schedule.response.replies.join('\n'), /1\./);
  });

  it('shows topic options when query is unclear', async () => {
    let { state, response } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state, response } = await handleTurn(
      { state, text: 'hello there', chatPhone: CHAT },
      facts,
    ));
    assert.equal(state.stage, 'await_query');
    assert.match(response.replies.join(' '), /LifeGuru support|Namaste/i);
    assert.equal(response.suggestions, undefined);
  });

  it('greets on hello without topic menu', async () => {
    let { state, response } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state, response } = await handleTurn({ state, text: 'hi', chatPhone: CHAT }, facts));
    assert.equal(state.stage, 'await_query');
    assert.match(response.replies.join(' '), /LifeGuru support|नमस्ते/i);
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

  it('lists recent bookings before a refund handoff', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const listed = await handleTurn(
      { state, text: 'I want a refund', chatPhone: CHAT },
      facts,
    );
    assert.equal(listed.response.action, 'reply');
    const body = listed.response.replies.join('\n');
    assert.match(body, /Satyanarayan/);
    assert.match(body, /Chadhava/);
    assert.equal(listed.state.stage, 'select_order');

    const picked = await handleTurn(
      { state: listed.state, text: '1', chatPhone: CHAT },
      facts,
    );
    assert.equal(picked.response.action, 'forward');
    assert.match(picked.response.replies.join('\n'), /Satyanarayan/);
  });

  it('asks for puja details when the refund booking is not in the list, then connects', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    ({ state } = await handleTurn(
      { state, text: 'I want refund for puja', chatPhone: CHAT },
      facts,
    ));
    const asked = await handleTurn(
      { state, text: 'it is a different puja', chatPhone: CHAT },
      facts,
    );
    assert.equal(asked.response.action, 'reply');
    assert.equal(asked.state.stage, 'await_handoff_details');
    const connected = await handleTurn(
      {
        state: asked.state,
        text: 'Ganesh puja on 2 March, booked from 9811111111',
        chatPhone: CHAT,
      },
      facts,
    );
    assert.equal(connected.response.action, 'forward');
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
