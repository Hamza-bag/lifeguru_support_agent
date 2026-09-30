const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseIsPrasadFlag } = require('../src/services/supportFacts/parseIsPrasadFlag');
const {
  buildVideoReply,
  buildPrasadReply,
  buildLiveReply,
} = require('../src/pipeline/factsReplies');

describe('parseIsPrasadFlag', () => {
  it('treats Yes/No strings correctly', () => {
    assert.equal(parseIsPrasadFlag('Yes'), true);
    assert.equal(parseIsPrasadFlag('No'), false);
    assert.equal(parseIsPrasadFlag(null), false);
  });
});

describe('buildVideoReply', () => {
  it('includes https link when video ready', () => {
    const out = buildVideoReply('en', {
      productName: 'Puja',
      videoReady: true,
      videoLink: 'https://example.com/v.mp4',
    });
    assert.match(out, /ready/i);
    assert.match(out, /https:\/\/example.com\/v.mp4/);
  });

  it('omits bad link scheme', () => {
    const out = buildVideoReply('en', {
      productName: 'Puja',
      videoReady: true,
      videoLink: 'javascript:alert(1)',
    });
    assert.doesNotMatch(out, /javascript/);
  });

  it('adds 5-day escalation when puja date old and no video', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const out = buildVideoReply('en', {
      productName: 'Puja',
      videoReady: false,
      scheduledAt: old,
    });
    assert.match(out, /3–4 days|3-4 days/i);
    assert.match(out, /human agent/i);
  });
});

describe('buildPrasadReply', () => {
  it('explains Prasad line item without home delivery', () => {
    const out = buildPrasadReply('en', {
      productName: 'Puja',
      isPrasad: false,
      prasadLineNames: ['Prasad ₹251'],
    });
    assert.match(out, /Prasad ₹251/);
    assert.match(out, /home Prasad delivery/i);
  });

  it('explains addons when home prasad not selected', () => {
    const out = buildPrasadReply('en', {
      productName: 'Satyanarayan',
      isPrasad: false,
      addonNames: ['Extra diya'],
    });
    assert.match(out, /does not include home prasad/i);
    assert.match(out, /Extra diya/);
  });

  it('includes tracking when dispatched', () => {
    const out = buildPrasadReply('en', {
      productName: 'Puja',
      isPrasad: true,
      prasadStatus: 'dispatched',
      trackingLink: 'https://track.example/1',
    });
    assert.match(out, /dispatched/i);
    assert.match(out, /track.example/);
  });

  it('pending when prasad selected but no tracking yet', () => {
    const out = buildPrasadReply('en', {
      productName: 'Puja',
      isPrasad: true,
      prasadStatus: 'pending',
      trackingLink: null,
    });
    assert.match(out, /pending/i);
  });
});

describe('buildLiveReply', () => {
  it('confirms live only when the order has a Live Puja line', () => {
    const yes = buildLiveReply('en', { productName: 'Sarva Rog', hasLivePuja: true });
    assert.match(yes, /includes Live Puja/i);
    assert.match(yes, /does not have that link/i);
    const no = buildLiveReply('en', { productName: 'Sheegrah Vivah', hasLivePuja: false });
    assert.match(no, /does not include Live Puja/i);
    assert.match(no, /not from the puja name/i);
  });
});
