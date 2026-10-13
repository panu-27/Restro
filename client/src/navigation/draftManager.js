/**
 * Draft Manager
 * 
 * Provides isolated, persistent drafts per table and parcel in localStorage.
 * Ensures Table 12 and Table 8 drafts never mix, and drafts persist across
 * route changes, unmounts, and reloads until explicitly discarded or ordered.
 */

const DRAFT_PREFIX = 'restro_draft_';
const PARCEL_DRAFT_KEY = 'restro_draft_parcel';

export function getDraftKey(tableId, isParcel = false) {
  if (tableId) return `${DRAFT_PREFIX}${tableId}`;
  if (isParcel) return PARCEL_DRAFT_KEY;
  return null;
}

export function getDraft(tableId, isParcel = false) {
  const key = getDraftKey(tableId, isParcel);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hasAnyContent = parsed.some(p => (Array.isArray(p.items) && p.items.length > 0) || (Array.isArray(p.extraCharges) && p.extraCharges.length > 0) || (p.discount && p.discount.type !== 'None'));
      return hasAnyContent ? parsed : null;
    }
    return null;
  } catch (err) {
    console.warn(`[DraftManager] Failed to load draft for ${key}:`, err);
    return null;
  }
}

export function saveDraft(tableId, draftParts, isParcel = false) {
  const key = getDraftKey(tableId, isParcel);
  if (!key) return;
  try {
    if (!draftParts || !Array.isArray(draftParts) || draftParts.length === 0) {
      clearDraft(tableId, isParcel);
      return;
    }

    // Save parts that contain items, extraCharges, or discounts
    const validParts = draftParts.map(p => ({
      label: p.label || 'Part 1',
      items: Array.isArray(p.items) ? p.items : [],
      extraCharges: Array.isArray(p.extraCharges) ? p.extraCharges : [],
      discount: p.discount || null
    })).filter(p => p.items.length > 0 || (p.extraCharges && p.extraCharges.length > 0) || (p.discount && p.discount.type !== 'None'));

    if (validParts.length > 0) {
      localStorage.setItem(key, JSON.stringify(validParts));
    } else {
      localStorage.removeItem(key);
    }

    // Notify listeners (TableGrid, etc.)
    window.dispatchEvent(new CustomEvent('restro_drafts_updated', {
      detail: { tableId, isParcel, key }
    }));
  } catch (err) {
    console.warn(`[DraftManager] Failed to save draft for ${key}:`, err);
  }
}

export function clearDraft(tableId, isParcel = false) {
  const key = getDraftKey(tableId, isParcel);
  if (!key) return;
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('restro_drafts_updated', {
      detail: { tableId, isParcel, key }
    }));
  } catch (err) {
    console.warn(`[DraftManager] Failed to clear draft for ${key}:`, err);
  }
}

export function hasDraft(tableId, isParcel = false) {
  return getDraft(tableId, isParcel) !== null;
}

export function getDraftTotal(tableId, isParcel = false) {
  const draft = getDraft(tableId, isParcel);
  if (!draft) return 0;
  let total = 0;
  for (const part of draft) {
    if (Array.isArray(part.items)) {
      for (const item of part.items) {
        const price = Number(item.price) || 0;
        const qty = Number(item.qty || item.quantity) || 1;
        total += price * qty;
      }
    }
  }
  return total;
}

export function getAllDrafts() {
  const drafts = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) {
        const tableId = k.replace(DRAFT_PREFIX, '');
        drafts[tableId] = getDraft(tableId);
      }
    }
  } catch (err) {
    console.warn('[DraftManager] Failed to list all drafts:', err);
  }
  return drafts;
}
