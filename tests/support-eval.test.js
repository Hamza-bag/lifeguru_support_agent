const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { handleTurn } = require('../src/pipeline/turn');
const { createStubFactsClient } = require('./helpers/stubFactsClient');

const facts = createStubFactsClient();
const CHAT = '9876543210';

function withLead(leads, lines) {
  const out = [];
  for (const lead of leads) {
    for (const line of lines) out.push(`${lead}${line}`.trim());
  }
  return out;
}

const LEADS = ['', 'Please ', 'Namaste, ', 'Bhai, ', 'Hello, '];

function casesFrom(label, lines, expect, leads = LEADS) {
  return withLead(leads, lines).map((text) => ({ label, text, expect }));
}

const singleTurns = [
  ...casesFrom(
    'autopay cancel → steps',
    [
      'autopay cancel karna hai',
      'cancel my autopay',
      'auto pay band kar do',
      'UPI mandate cancel kaise karein',
      'stop my autopay mandate',
      'ऑटोपे बंद करना है',
    ],
    { action: 'reply', faqId: 'sub_autopay_cancel_steps' },
  ),
  ...casesFrom(
    'autopay charge → why card',
    [
      'why was autopay 501 charged',
      'autopay se 501 kata kyun',
      'autopay deducted without asking',
      'mandate pe 301 kyun kata',
      'ऑटोपे से 501 क्यों कटा',
    ],
    { action: 'reply', faqId: 'autopay_501' },
  ),
  ...casesFrom(
    'puja duration → knowledge base',
    [
      'how long does a puja last',
      'puja kitni der chalti hai',
      'puja kitne ghante chalegi',
      'what is the puja duration',
      'पूजा कितनी देर चलती है',
    ],
    { action: 'reply', faqId: 'puja_duration_hours' },
  ),
  ...casesFrom(
    'refund → list booking first',
    [
      'I want a refund',
      'refund chahiye',
      'paisa wapas karo',
      'cancel my puja booking',
      'मुझे रिफंड चाहिए',
    ],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'invoice → person',
    ['send my invoice', 'invoice bhejo', 'receipt chahiye', 'bill bhejo', 'रसीद भेजो'],
    { action: 'forward' },
  ),
  ...casesFrom(
    'abuse → person',
    [
      'this is useless I am furious',
      'bakwas service fraud',
      'you cheated me idiot',
      'यह धोखा है गुस्सा आ रहा है',
    ],
    { action: 'forward' },
  ),
  ...casesFrom(
    'video status → booking lookup',
    [
      'when is my video',
      'mera video kab aayega',
      'video status of my booking',
      'मेरा वीडियो कब आएगा',
    ],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'puja time → booking lookup',
    [
      'when is my puja',
      'meri puja kab hai',
      'puja schedule kab hai',
      'मेरी पूजा कब है',
    ],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'prasad tracking → booking lookup',
    ['prasad kab milega', 'where is my prasad tracking', 'प्रसाद कब मिलेगा'],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'which puja marriage → card then person',
    ['shaadi ke liye kaunsi puja', 'which puja for marriage', 'vivah ke liye koi puja'],
    { action: 'forward', faqId: 'which_puja_marriage' },
  ),
  ...casesFrom(
    'which puja debt → card then person',
    ['karz ke liye kaunsi puja', 'which puja for debt', 'loan ke liye koi puja'],
    { action: 'forward', faqId: 'which_puja_debt' },
  ),
  ...casesFrom(
    'hanuman puja → card then person',
    ['hanuman puja kaunsi hai', 'which hanuman puja is open'],
    { action: 'forward', faqId: 'which_puja_hanuman' },
  ),
  ...casesFrom(
    'ganesh not listed → card then person',
    ['ganesh puja chahiye', 'ganpati puja book karni hai'],
    { action: 'forward', faqId: 'which_puja_not_in_catalogue' },
  ),
  ...casesFrom(
    'damaged prasad → card then person',
    ['prasad box damaged', 'prasad ka dabba kharab hai', 'prasad box toota'],
    { action: 'forward', faqId: 'prasad_box_damaged' },
  ),
  ...casesFrom(
    'add prasad → card then person',
    ['add prasad after booking', 'prasad add karna hai'],
    { action: 'forward', faqId: 'prasad_add_after_booking' },
  ),
  ...casesFrom(
    'payment failed → card then person',
    ['payment failed booking nahi hui', 'paid but payment pending'],
    { action: 'forward', faqId: 'payment_done_not_confirmed' },
  ),
  ...casesFrom(
    'name or gotra change → list booking',
    ['gotra change karna hai', 'naam galat hai change kardo', 'sankalp update kardo'],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'booking already paid → lookup',
    ['is my booking confirm hai', 'payment ho gayi booking confirm'],
    { action: 'reply', stage: 'select_order' },
  ),
  ...casesFrom(
    'catalogue live → knowledge base',
    ['which puja is live', 'is live puja available today'],
    { action: 'reply', faqId: 'live_puja_not_available' },
  ),
  ...casesFrom(
    'no benefit → knowledge base first',
    ['puja kara li koi fayda nahi', 'no benefit from the puja'],
    { action: 'reply', faqId: 'puja_no_benefit_no_guarantee' },
    [''],
  ),
  ...casesFrom(
    'greeting',
    ['Hi', 'Hello', 'Namaste'],
    { action: 'reply', stage: 'await_query' },
    [''],
  ),
  ...casesFrom(
    'stretched hello → greet then topics',
    ['Hellooooo', 'Hiiii'],
    { action: 'reply', stage: 'pick_topic' },
    [''],
  ),
  ...casesFrom(
    'vague help → topics',
    ['help chahiye', 'hey help', 'madad chahiye'],
    { action: 'reply', stage: 'pick_topic' },
    [''],
  ),
];

const insistFollowUps = [
  'tum hi cancel karo mera paisa kata',
  'aap hi cancel kar do',
  'you cancel it for me',
  'तुम ही करो',
  'khud cancel karo',
];

const repeatLines = [
  'Please cancel my autopay mandate',
  'autopay band kaise karun',
  'ऑटोपे बंद करना है',
];

function grade(turn, expect) {
  const action = turn.response?.action;
  const stage = turn.state?.stage;
  const meta = turn.response?.classifyMeta || {};
  const blob = `${meta.faqId || ''} ${meta.reason || ''}`;
  if (expect.action && action !== expect.action) {
    return `action ${action} expected ${expect.action}`;
  }
  if (expect.stage && stage !== expect.stage) {
    return `stage ${stage} expected ${expect.stage}`;
  }
  if (expect.faqId && !blob.includes(expect.faqId)) {
    return `faq ${blob || 'none'} expected ${expect.faqId}`;
  }
  return null;
}

async function ask(text, state) {
  return handleTurn(
    { state, text, chatPhone: CHAT, isNewChat: !state },
    facts,
  );
}

describe('support routing eval', () => {
  it('grades hinglish, english, and hindi variations from real support chats', async () => {
    const failures = [];
    let graded = 0;

    for (const item of singleTurns) {
      const turn = await ask(item.text);
      graded += 1;
      const problem = grade(turn, item.expect);
      if (problem) failures.push(`${item.label} | ${item.text} | ${problem}`);
    }

    for (const follow of insistFollowUps) {
      const first = await ask('Autopay cancel karna hai');
      graded += 1;
      const firstProblem = grade(first, {
        action: 'reply',
        faqId: 'sub_autopay_cancel_steps',
      });
      if (firstProblem) failures.push(`autopay first | ${firstProblem}`);
      const second = await ask(follow, first.state);
      graded += 1;
      const secondProblem = grade(second, { action: 'forward' });
      if (secondProblem) {
        failures.push(`insist after steps | ${follow} | ${secondProblem} | ${second.response?.classifyMeta?.reason}`);
      } else if (second.response?.classifyMeta?.reason !== 'rules_insist_after_faq') {
        failures.push(
          `insist after steps | ${follow} | reason ${second.response?.classifyMeta?.reason}`,
        );
      }
    }

    for (const line of repeatLines) {
      let state;
      const opened = await ask(line);
      graded += 1;
      state = opened.state;
      let problem = grade(opened, { action: 'reply', faqId: 'sub_autopay_cancel_steps' });
      if (problem) failures.push(`repeat 1 | ${line} | ${problem}`);
      const again = await ask(line, state);
      graded += 1;
      state = again.state;
      problem = grade(again, { action: 'reply', faqId: 'sub_autopay_cancel_steps' });
      if (problem) failures.push(`repeat 2 | ${line} | ${problem}`);
      const third = await ask(line, state);
      graded += 1;
      problem = grade(third, { action: 'forward' });
      if (problem || third.response?.classifyMeta?.reason !== 'rules_faq_repeat') {
        failures.push(
          `repeat 3 | ${line} | ${problem || third.response?.classifyMeta?.reason}`,
        );
      }
    }

    const debit = await ask('paise cut gaye 501', (await ask('autopay cancel karna hai')).state);
    graded += 2;
    const debitProblem = grade(debit, { action: 'reply', faqId: 'autopay_501' });
    if (debitProblem) failures.push(`debit after steps | ${debitProblem}`);

    assert.ok(graded >= 300, `graded ${graded}, wanted at least 300`);
    assert.deepEqual(failures, [], failures.slice(0, 25).join('\n'));
  });
});
