const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseOrderLookup } = require('../src/orders/orderLookup');
const { normalizeClassifyResult } = require('../src/llm/classify');
const { tryRulesRoute } = require('../src/conversation/rulesRoute');
const { handleTurn } = require('../src/pipeline/turn');
const { createStubFactsClient } = require('./helpers/stubFactsClient');

describe('order lookup keys', () => {
  it('maps first and latest without a date', () => {
    assert.equal(parseOrderLookup('what was my first order').key, 'first');
    assert.equal(parseOrderLookup('sabse pehli booking').key, 'first');
    assert.equal(parseOrderLookup('my latest order').key, 'latest');
    assert.equal(parseOrderLookup('when is my puja'), null);
  });

  it('reads an Indian date as day/month/year and a puja day separately from the booking day', () => {
    assert.deepEqual(parseOrderLookup('my order on 05/03/2026'), {
      key: 'on_date',
      date: '2026-03-05',
    });
    assert.deepEqual(parseOrderLookup('meri puja on 05/03/2026'), {
      key: 'puja_on',
      date: '2026-03-05',
    });
    assert.deepEqual(parseOrderLookup('orders from 01/03/2026 to 10/03/2026'), {
      key: 'between',
      from: '2026-03-01',
      to: '2026-03-10',
    });
    assert.equal(parseOrderLookup('my puja in March').deferToModel, true);
  });

  it('keeps a model date key on the admin route and drops a bad date', () => {
    const dated = normalizeClassifyResult(
      {
        language: 'en',
        route: 'admin',
        intent: null,
        orderLookup: 'on_date',
        orderDate: '2026-04-02',
      },
      'booking on 2 April',
    );
    assert.equal(dated.route, 'admin');
    assert.equal(dated.intent, 'both');
    assert.deepEqual(dated.orderLookup, { key: 'on_date', date: '2026-04-02' });

    const bad = normalizeClassifyResult(
      { language: 'en', route: 'admin', intent: 'puja', orderLookup: 'on_date', orderDate: 'April' },
      'when is my puja',
    );
    assert.equal(bad.orderLookup, undefined);
  });

  it('rules call the first-order key and leave a normal status question on the latest list', () => {
    const first = tryRulesRoute({ stage: 'await_query' }, 'show my first order');
    assert.equal(first.route, 'admin');
    assert.equal(first.orderLookup.key, 'first');
    const status = tryRulesRoute({ stage: 'await_query' }, 'when is my puja');
    assert.equal(status.route, 'admin');
    assert.equal(status.orderLookup, undefined);
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'my puja in March'), null);
  });

  it('passes the first-order key into lookup', async () => {
    const calls = [];
    const facts = createStubFactsClient({
      lookupByPhone: async (phone, lookup) => {
        calls.push({ phone, lookup });
        return {
          matched: true,
          customerId: '1',
          name: 'A',
          orders: [
            {
              id: '10',
              customerId: '1',
              title: 'Test puja',
              bookedOn: '2024-01-01',
              status: 'paid',
            },
          ],
        };
      },
    });
    await handleTurn(
      { text: 'my first order', chatPhone: '9876543210', isNewChat: false },
      facts,
    );
    assert.equal(calls[0].lookup.key, 'first');
  });

  it('returns that booking’s video, including on a follow-up', async () => {
    const facts = createStubFactsClient({
      lookupByPhone: async (_phone, lookup) => {
        assert.equal(lookup.key, 'first');
        return {
          matched: true,
          customerId: '1',
          name: 'A',
          orders: [
            {
              id: '55',
              customerId: '1',
              title: 'Old puja',
              bookedOn: '2024-01-01',
              status: 'paid',
            },
          ],
        };
      },
      getOrderFacts: async (orderId) => {
        assert.equal(String(orderId), '55');
        return {
          orderId: '55',
          productName: 'Old puja',
          scheduledAt: '2024-01-02T10:00:00.000Z',
          orderStatus: 'paid',
          videoReady: true,
          videoLink: 'https://example.com/old-video',
          isPrasad: false,
          hasLivePuja: false,
        };
      },
    });
    const first = await handleTurn(
      { text: 'what was my first order', chatPhone: '9876543210' },
      facts,
    );
    assert.match(first.response.replies.join(' '), /Old puja/);
    assert.doesNotMatch(first.response.replies.join(' '), /prasad/i);
    const video = await handleTurn(
      { state: first.state, text: 'uska video bhejo', chatPhone: '9876543210' },
      facts,
    );
    assert.match(video.response.replies.join(' '), /example.com\/old-video/);
  });
});
