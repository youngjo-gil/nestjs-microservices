export const USERS_PATTERNS = {
  GET_USERS: 'get_users',
  GET_USER: 'get_user',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
};

export const AUTH_PATTERNS = {
  LOGIN: 'login',
  REGISTER: 'register',
  VALIDATE_TOKEN: 'validate_token',
};

export const ORDERS_PATTERNS = {
  GET_ORDERS: 'get_orders',
  GET_ORDER: 'get_order',
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
};

export const ORDER_EVENTS = {
  CREATED: 'order.created',
  UPDATED: 'order.updated',
  SHIPPED: 'order.shipped',
  DELIVERED: 'order.delivered',
};

export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  DELETED: 'user.deleted',
};

export const SERVICE_NAMES = {
  AUTH_SERVICE: 'AUTH_SERVICE',
  USERS_SERVICE: 'USERS_SERVICE',
  ORDERS_SERVICE: 'ORDERS_SERVICE',
  NOTIFICATIONS_SERVICE: 'NOTIFICATIONS_SERVICE',
};
