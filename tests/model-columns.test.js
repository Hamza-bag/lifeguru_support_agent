const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ALLOWED_USER_COLUMNS,
  ALLOWED_ORDER_COLUMNS,
  ALLOWED_ORDER_LINE_ITEM_COLUMNS,
  ALLOWED_ORDER_USER_DETAILS_COLUMNS,
  ALLOWED_ORDER_DELIVERY_TRACKING_COLUMNS,
  ALLOWED_PUJAS_HISTORY_COLUMNS,
  ALLOWED_PUJA_GROUP_COLUMNS,
} = require('../src/models/index');

describe('support models column allow-list', () => {
  it('documents minimal columns per table', () => {
    assert.deepEqual(ALLOWED_USER_COLUMNS, [
      'id',
      'user_name',
      'phone',
      'country_code',
      'is_delete',
    ]);
    assert.ok(ALLOWED_ORDER_COLUMNS.includes('full_video_link'));
    assert.ok(!ALLOWED_ORDER_COLUMNS.includes('total_amount'));
    assert.ok(ALLOWED_ORDER_LINE_ITEM_COLUMNS.includes('product_name'));
    assert.ok(!ALLOWED_ORDER_USER_DETAILS_COLUMNS.includes('delivery_address'));
    assert.ok(ALLOWED_ORDER_DELIVERY_TRACKING_COLUMNS.includes('tracking_link'));
    assert.ok(ALLOWED_PUJAS_HISTORY_COLUMNS.includes('puja_group_id'));
    assert.ok(ALLOWED_PUJA_GROUP_COLUMNS.includes('puja_guidelines'));
  });
});
