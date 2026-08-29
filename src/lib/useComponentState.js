import { useCallback, useMemo, useState } from "react";
import { defaultValues, variantValues } from "../registry";

const STORAGE_PREFIX = "compshope:custom:";
const HISTORY_LIMIT = 50;

function storageKey(id) {
  return STORAGE_PREFIX + id;
}

/** Saved custom styles for a component, or [] when storage is unavailable. */
export function loadSaved(id) {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(id, styles) {
  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(styles));
  } catch {
    // Private browsing / quota — saving is a convenience, not a requirement.
  }
}

/**
 * Holds the live prop values for one component, with variant selection,
 * undo/redo and localStorage-backed custom styles.
 */
export default function useComponentState(item) {
  const [saved, setSaved] = useState(() => loadSaved(item.id));
  const [variantId, setVariantId] = useState(item.variants[0].id);
  const [values, setValues] = useState(() => variantValues(item, item.variants[0].id));
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Built-in variants plus anything the visitor saved, in one list.
  const variants = useMemo(
    () => [...item.variants, ...saved.map((s) => ({ ...s, custom: true }))],
    [item.variants, saved]
  );

  const commit = useCallback(
    (nextValues) => {
      setPast((p) => [...p, values].slice(-HISTORY_LIMIT));
      setFuture([]);
      setValues(nextValues);
    },
    [values]
  );

  const setValue = useCallback(
    (key, value) => commit({ ...values, [key]: value }),
    [commit, values]
  );

  const selectVariant = useCallback(
    (id) => {
      const variant = variants.find((v) => v.id === id);
      if (!variant) return;
      setVariantId(id);
      commit({ ...defaultValues(item), ...variant.values });
    },
    [commit, item, variants]
  );

  const reset = useCallback(() => {
    const variant = variants.find((v) => v.id === variantId);
    commit({ ...defaultValues(item), ...(variant ? variant.values : null) });
  }, [commit, item, variantId, variants]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [values, ...f]);
      setValues(previous);
      return p.slice(0, -1);
    });
  }, [values]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      setPast((p) => [...p, values].slice(-HISTORY_LIMIT));
      setValues(f[0]);
      return f.slice(1);
    });
  }, [values]);

  const save = useCallback(
    (name) => {
      const style = {
        id: `custom-${Date.now()}`,
        name: name || `Custom ${saved.length + 1}`,
        values,
      };
      const next = [...saved, style];
      setSaved(next);
      persist(item.id, next);
      setVariantId(style.id);
      return style;
    },
    [item.id, saved, values]
  );

  const remove = useCallback(
    (id) => {
      const next = saved.filter((s) => s.id !== id);
      setSaved(next);
      persist(item.id, next);
      if (variantId === id) selectVariant(item.variants[0].id);
    },
    [item.id, item.variants, saved, selectVariant, variantId]
  );

  return {
    values,
    setValue,
    variants,
    variantId,
    selectVariant,
    reset,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    save,
    remove,
  };
}
