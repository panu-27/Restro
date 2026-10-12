/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getSafeFallback, isRouteAuthorized, ROLES } from './routeRegistry';
import { hasDraft } from './draftManager';

const NavigationContext = createContext(null);

let _navId = 0;
const generateNavId = () => `nav_${Date.now()}_${++_navId}`;

export const NavigationProvider = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation stack: array of history entries
  const historyStackRef = useRef([]);
  // UI state cache per route/screen (e.g., filters, scroll position)
  const screenStateCacheRef = useRef(new Map());
  // Registered custom modal / back interceptors
  const activeInterceptorsRef = useRef(new Set());

  const userRole = user?.role || ROLES.ADMIN;

  // Extract current context from location
  const currentTableId = searchParams.get('tableId');
  const currentOrderId = searchParams.get('orderId');
  const isCreatingParcel = searchParams.get('newParcel') === 'true';
  const currentScreen = searchParams.get('screen') || 'menu';
  const currentModal = searchParams.get('modal');
  const currentSection = searchParams.get('section') || 'home';

  // Synchronize history stack on route change
  useEffect(() => {
    const fullUrl = `${location.pathname}${location.search}`;
    const stack = historyStackRef.current;
    const lastEntry = stack[stack.length - 1];

    if (!lastEntry || lastEntry.fullUrl !== fullUrl) {
      // Determine parent for this entry
      let parentRoute = null;
      if (lastEntry) {
        // If moving from a different main route, record that previous route as parent
        if (lastEntry.pathname !== location.pathname) {
          parentRoute = lastEntry.fullUrl;
        } else if (lastEntry.fullUrl !== fullUrl) {
          parentRoute = lastEntry.fullUrl;
        }
      }

      // If no valid parent recorded (e.g. direct load or refresh), resolve from route registry
      if (!parentRoute) {
        if (currentTableId || currentOrderId || isCreatingParcel) {
          parentRoute = '/tables';
        } else if (location.pathname === '/settings') {
          parentRoute = '/dashboard';
        } else {
          parentRoute = getSafeFallback(location.pathname, userRole);
        }
      }

      // Avoid circular parent
      if (parentRoute === fullUrl) {
        parentRoute = getSafeFallback(location.pathname, userRole);
      }

      const newEntry = {
        id: generateNavId(),
        pathname: location.pathname,
        search: location.search,
        fullUrl,
        params: {
          tableId: currentTableId,
          orderId: currentOrderId,
          isParcel: isCreatingParcel,
          screen: currentScreen,
          modal: currentModal,
          section: currentSection
        },
        parentRoute,
        timestamp: Date.now()
      };

      // Prevent duplicate consecutive entries
      if (lastEntry && lastEntry.fullUrl === fullUrl) {
        stack[stack.length - 1] = newEntry;
      } else {
        // Keep max 50 entries to prevent memory leak
        if (stack.length > 50) stack.shift();
        stack.push(newEntry);
      }
    }
  }, [location.pathname, location.search, currentTableId, currentOrderId, isCreatingParcel, currentScreen, currentModal, currentSection, userRole]);

  /**
   * Register a custom modal or popup interceptor (returns unregister function)
   */
  const registerBackInterceptor = useCallback((interceptorFn) => {
    activeInterceptorsRef.current.add(interceptorFn);
    return () => {
      activeInterceptorsRef.current.delete(interceptorFn);
    };
  }, []);

  /**
   * Save UI state for current screen
   */
  const saveScreenState = useCallback((key, state) => {
    screenStateCacheRef.current.set(key, state);
  }, []);

  /**
   * Retrieve cached UI state
   */
  const getScreenState = useCallback((key) => {
    return screenStateCacheRef.current.get(key) || null;
  }, []);

  /**
   * Master Unified Back Action Handler
   * Follows strict 6-stage order:
   * 1. Topmost popup/modal dismissal
   * 2. Unsaved changes handling
   * 3. Pop nested screen
   * 4. Restore UI state
   * 5. Fallback to valid module root
   * 6. Safety check
   */
  const handleBack = useCallback(() => {
    // Stage 1 & 2: Check registered custom interceptors first
    for (const interceptor of Array.from(activeInterceptorsRef.current).reverse()) {
      const handled = interceptor();
      if (handled) return true;
    }

    const modal = searchParams.get('modal');
    const screen = searchParams.get('screen') || 'menu';
    const section = searchParams.get('section') || 'home';
    const tableId = searchParams.get('tableId');
    const orderId = searchParams.get('orderId');
    const isParcel = searchParams.get('newParcel') === 'true';
    const isInsideTableView = !!(tableId || orderId || isParcel);

    // ── STAGE 1: Dismiss Topmost Modal ──
    if (modal) {
      // Special check: If discard confirmation modal is open, closing it keeps user on screen (Cancel)
      if (modal === 'discard' || modal === 'unsaved') {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('modal');
        setSearchParams(nextParams, { replace: true });
        return true;
      }

      // Any other modal (variations, settings, transfer, delete, discount, numpad)
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('modal');
      nextParams.delete('itemId');
      setSearchParams(nextParams, { replace: true });
      return true;
    }

    // ── STAGE 2: Handle Unsaved Changes in TableView ──
    if (isInsideTableView) {
      // Check if table or parcel has unsaved draft items
      const hasUnsaved = hasDraft(tableId, isParcel);
      if (hasUnsaved && modal !== 'discard') {
        // Prompt with established confirmation dialog
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('modal', 'discard');
        setSearchParams(nextParams);
        return true;
      }

      // ── STAGE 3: Pop Nested Screen in TableView ──
      if (screen === 'cart') {
        const stack = historyStackRef.current;
        const cameFromPos = location.pathname === '/pos';
        const hasMenuInHistory = stack.some(e => e.pathname === location.pathname && e.params?.screen === 'menu');

        // Only pop to menu if we actually had menu in the history or didn't come directly from /pos
        if (!cameFromPos || hasMenuInHistory) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('screen', 'menu');
          setSearchParams(nextParams, { replace: true });
          return true;
        }
      }

      if (screen === 'bill') {
        // Return from Bill to Cart
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('screen', 'cart');
        setSearchParams(nextParams, { replace: true });
        return true;
      }

      // Exiting TableView: find the recorded parent route that opened it
      const stack = historyStackRef.current;
      let targetParent = location.pathname || '/tables';
      for (let i = stack.length - 1; i >= 0; i--) {
        const entry = stack[i];
        if (entry.pathname && !entry.params.tableId && !entry.params.orderId && !entry.params.isParcel) {
          if (isRouteAuthorized(entry.pathname, userRole)) {
            targetParent = entry.fullUrl;
            break;
          }
        }
      }

      // Close TableView overlay by clearing params and navigating to target parent
      setSearchParams({}, { replace: true });
      navigate(targetParent, { replace: true });
      return true;
    }

    // ── STAGE 3 (Settings): Pop Nested Sub-Sections ──
    if (location.pathname === '/settings') {
      if (section === 'addMenuItem' || section === 'editMenuItem') {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('section', 'menu');
          nextParams.delete('id');
          setSearchParams(nextParams, { replace: true });
        }
        return true;
      }

      if (section !== 'home') {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('section', 'home');
          nextParams.delete('form');
          nextParams.delete('modal');
          nextParams.delete('id');
          setSearchParams(nextParams, { replace: true });
        }
        return true;
      }

      // From settings home, back goes to Dashboard
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/dashboard', { replace: true });
      }
      return true;
    }

    // ── STAGE 5: Module Root Fallback ──
    // For main screens (/tables, /pos, /parcel, /history, /sales), return to /dashboard
    if (location.pathname !== '/dashboard' && location.pathname !== '/') {
      navigate('/dashboard', { replace: true });
      return true;
    }

    // If already on /dashboard, do nothing to prevent unintended exits or loops
    return false;
  }, [location.pathname, searchParams, setSearchParams, navigate, userRole]);

  // Unified Keyboard Listeners: Escape and Alt+Left
  useEffect(() => {
    const onKeyDown = (e) => {
      // 1. Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
        return;
      }

      // 2. Alt + ArrowLeft
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack]);

  const getHistoryStack = useCallback(() => {
    return [...historyStackRef.current];
  }, []);

  const value = {
    handleBack,
    registerBackInterceptor,
    saveScreenState,
    getScreenState,
    getHistoryStack
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return ctx;
};

