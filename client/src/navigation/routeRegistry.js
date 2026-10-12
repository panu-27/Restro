/**
 * Route Registry
 * 
 * Central registry of all routes, sub-screens, modals, permitted parents,
 * role permissions, and safe fallbacks across the restaurant POS application.
 */

export const ROLES = {
  ADMIN: 'Admin',
  WAITER: 'Waiter',
  KITCHEN: 'Kitchen',
  ALL: '*'
};

export const ROUTES = {
  // ── Main Module Routes ──
  dashboard: {
    id: 'dashboard',
    path: '/dashboard',
    defaultParent: null, // Root
    moduleRoot: '/dashboard',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  tables: {
    id: 'tables',
    path: '/tables',
    defaultParent: '/dashboard',
    moduleRoot: '/tables',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  pos: {
    id: 'pos',
    path: '/pos',
    defaultParent: '/dashboard',
    moduleRoot: '/pos',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  parcel: {
    id: 'parcel',
    path: '/parcel',
    defaultParent: '/dashboard',
    moduleRoot: '/parcel',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  quick: {
    id: 'quick',
    path: '/quick',
    defaultParent: '/dashboard',
    moduleRoot: '/quick',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  sales: {
    id: 'sales',
    path: '/sales',
    defaultParent: '/dashboard',
    moduleRoot: '/sales',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  history: {
    id: 'history',
    path: '/history',
    defaultParent: '/dashboard',
    moduleRoot: '/history',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },
  settings: {
    id: 'settings',
    path: '/settings',
    defaultParent: '/dashboard',
    moduleRoot: '/settings',
    allowedRoles: [ROLES.ADMIN],
    requiresUnsavedConfirmation: false
  },

  // ── Role-Specific Landing Routes ──
  waiter: {
    id: 'waiter',
    path: '/waiter',
    defaultParent: null,
    moduleRoot: '/waiter',
    allowedRoles: [ROLES.WAITER],
    requiresUnsavedConfirmation: false
  },
  kitchen: {
    id: 'kitchen',
    path: '/kitchen',
    defaultParent: null,
    moduleRoot: '/kitchen',
    allowedRoles: [ROLES.KITCHEN],
    requiresUnsavedConfirmation: false
  },

  // ── Public Routes ──
  loyaltyScan: {
    id: 'loyaltyScan',
    path: '/loyalty/scan',
    defaultParent: null,
    moduleRoot: '/loyalty/scan',
    allowedRoles: [ROLES.ALL],
    requiresUnsavedConfirmation: false
  },
  publicRestro: {
    id: 'publicRestro',
    path: '/restro/:restro_name',
    defaultParent: null,
    moduleRoot: '/restro',
    allowedRoles: [ROLES.ALL],
    requiresUnsavedConfirmation: false
  }
};

/**
 * Settings Sub-Sections Hierarchy
 */
export const SETTINGS_SECTIONS = {
  addMenuItem: {
    parentSection: 'menu',
    requiresUnsavedConfirmation: true
  },
  menu: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  restaurant: {
    parentSection: 'home',
    requiresUnsavedConfirmation: true
  },
  taxes: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  tables: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  loyalty: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  staff: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  printer: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  billing: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  password: {
    parentSection: 'home',
    requiresUnsavedConfirmation: false
  },
  home: {
    parentPath: '/dashboard',
    requiresUnsavedConfirmation: false
  }
};

/**
 * TableView Sub-Screens Hierarchy
 */
export const TABLE_SCREENS = {
  menu: {
    defaultParent: '/tables',
    allowedParents: ['/tables', '/pos', '/history', '/parcel', '/dashboard'],
    requiresUnsavedConfirmation: true
  },
  cart: {
    parentScreen: 'menu',
    requiresUnsavedConfirmation: false
  },
  bill: {
    parentScreen: 'cart',
    requiresUnsavedConfirmation: false
  }
};

/**
 * Registered Modals inside TableView
 */
export const TABLE_MODALS = [
  'variations',
  'settings',
  'transfer',
  'delete',
  'discard',
  'discount',
  'extraCharges',
  'numpad'
];

/**
 * Resolves safe fallback for direct access or when previous entry is missing
 */
export function getSafeFallback(pathname = '/dashboard', role = ROLES.ADMIN) {
  if (role === ROLES.WAITER) return '/waiter';
  if (role === ROLES.KITCHEN) return '/kitchen';

  for (const key of Object.keys(ROUTES)) {
    const route = ROUTES[key];
    if (route.path === pathname) {
      if (route.allowedRoles.includes(role) || route.allowedRoles.includes(ROLES.ALL)) {
        return route.defaultParent || route.path;
      }
    }
  }
  return '/dashboard';
}

/**
 * Checks whether a given role is authorized for a route pathname
 */
export function isRouteAuthorized(pathname = '', role = ROLES.ADMIN) {
  if (pathname.startsWith('/restro/') || pathname.startsWith('/loyalty/scan')) {
    return true;
  }
  if (!role) return false;
  if (role === ROLES.WAITER) return pathname === '/waiter';
  if (role === ROLES.KITCHEN) return pathname === '/kitchen';
  if (role === ROLES.ADMIN) return true;
  return false;
}
