/**
 * Trimmed Sequelize models — only columns used by src/services/supportFacts/*.
 * Source of truth for schema: lifeguru_core_backend migrations.
 */
const { DataTypes } = require('sequelize');
const { getSequelize } = require('../db/sequelize');

/** @type {readonly string[]} */
const ALLOWED_USER_COLUMNS = ['id', 'user_name', 'phone', 'country_code', 'is_delete'];
/** @type {readonly string[]} */
const ALLOWED_ORDER_COLUMNS = [
  'id',
  'user_id',
  'status',
  'full_video_link',
  'created_at',
  'is_delete',
];
/** @type {readonly string[]} */
const ALLOWED_ORDER_LINE_ITEM_COLUMNS = [
  'id',
  'order_id',
  'product_id',
  'product_name',
  'product_type',
  'actual_pooja_time',
  'is_delete',
];
/** @type {readonly string[]} */
const ALLOWED_ORDER_USER_DETAILS_COLUMNS = ['order_id', 'is_prasad', 'is_delete'];
/** @type {readonly string[]} */
const ALLOWED_ORDER_DELIVERY_TRACKING_COLUMNS = [
  'order_line_item_id',
  'delivery_status',
  'tracking_link',
  'updated_at',
];
/** @type {readonly string[]} */
const ALLOWED_PUJAS_HISTORY_COLUMNS = ['id', 'product_id', 'puja_group_id', 'is_delete'];
/** @type {readonly string[]} */
const ALLOWED_PUJA_GROUP_COLUMNS = ['id', 'puja_guidelines', 'dos'];

function initModels() {
  const sequelize = getSequelize();

  const User = sequelize.define(
    'user',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_name: { type: DataTypes.STRING, defaultValue: '' },
      phone: { type: DataTypes.STRING },
      country_code: { type: DataTypes.STRING },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'users', timestamps: false },
  );

  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER },
      status: { type: DataTypes.STRING },
      full_video_link: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'orders', timestamps: false },
  );

  const OrderLineItem = sequelize.define(
    'OrderLineItem',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: DataTypes.INTEGER },
      product_id: { type: DataTypes.INTEGER },
      product_name: { type: DataTypes.STRING(255) },
      product_type: { type: DataTypes.TEXT },
      actual_pooja_time: { type: DataTypes.DATE },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'order_line_items', timestamps: false },
  );

  const OrderUserDetails = sequelize.define(
    'order_user_details',
    {
      order_id: { type: DataTypes.INTEGER },
      is_prasad: { type: DataTypes.STRING(3), allowNull: true },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'order_user_details', timestamps: false, underscored: true },
  );

  const OrderDeliveryTracking = sequelize.define(
    'OrderDeliveryTracking',
    {
      order_line_item_id: { type: DataTypes.INTEGER },
      delivery_status: { type: DataTypes.STRING },
      tracking_link: { type: DataTypes.TEXT, allowNull: true },
      updated_at: { type: DataTypes.DATE },
    },
    { tableName: 'order_delivery_trackings', timestamps: false },
  );

  const PujasHistory = sequelize.define(
    'PujasHistory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER },
      puja_group_id: { type: DataTypes.INTEGER },
      is_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'pujas_history', timestamps: false, underscored: true },
  );

  const PujaGroup = sequelize.define(
    'PujaGroup',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      puja_guidelines: { type: DataTypes.JSONB, allowNull: true },
      dos: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'puja_groups', timestamps: false, underscored: true },
  );

  Order.belongsTo(User, { foreignKey: 'user_id' });
  Order.hasMany(OrderLineItem, { foreignKey: 'order_id', as: 'orderLineItems' });
  Order.hasMany(OrderUserDetails, { foreignKey: 'order_id', as: 'orderUserDetails' });
  OrderLineItem.hasOne(OrderDeliveryTracking, {
    foreignKey: 'order_line_item_id',
    as: 'deliveryTracking',
  });
  PujasHistory.belongsTo(PujaGroup, { foreignKey: 'puja_group_id' });

  return {
    sequelize,
    User,
    Order,
    OrderLineItem,
    OrderUserDetails,
    OrderDeliveryTracking,
    PujasHistory,
    PujaGroup,
  };
}

let models;

function getModels() {
  if (!models) {
    models = initModels();
  }
  return models;
}

module.exports = {
  getModels,
  ALLOWED_USER_COLUMNS,
  ALLOWED_ORDER_COLUMNS,
  ALLOWED_ORDER_LINE_ITEM_COLUMNS,
  ALLOWED_ORDER_USER_DETAILS_COLUMNS,
  ALLOWED_ORDER_DELIVERY_TRACKING_COLUMNS,
  ALLOWED_PUJAS_HISTORY_COLUMNS,
  ALLOWED_PUJA_GROUP_COLUMNS,
};
