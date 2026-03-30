import * as React from "react";

const TOAST_LIMIT = 1;
const DEFAULT_TOAST_DURATION = 5000;
const TOAST_REMOVE_DELAY = 10000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

/**
 * Generate a unique toast ID.
 * @returns {string}
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map();
const toastDismissTimeouts = new Map();

/**
 * Schedule removal of a toast after the remove delay.
 * @param {string} toastId
 */
const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId: toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Toast state reducer.
 * @param {object} state
 * @param {object} action
 * @returns {object}
 */
const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((t) => {
          addToRemoveQueue(t.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === void 0
            ? { ...t, open: false }
            : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === void 0) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];
let memoryState = { toasts: [] };

/**
 * Dispatch an action to update global toast state and notify listeners.
 * @param {object} action
 */
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 * Create and show a new toast notification.
 * @param {object} props - Toast properties (title, description, variant, etc.).
 * @returns {{ id: string, dismiss: Function, update: Function }}
 */
function toast(props) {
  const id = genId();
  const duration =
    Number.isFinite(props.duration) && props.duration > 0
      ? props.duration
      : DEFAULT_TOAST_DURATION;

  const update = (updatedProps) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...updatedProps, id: id } });

  const dismiss = () => {
    const timeout = toastDismissTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastDismissTimeouts.delete(id);
    }
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  if (Number.isFinite(duration) && duration > 0) {
    const timeout = setTimeout(() => {
      dismiss();
    }, duration);
    toastDismissTimeouts.set(id, timeout);
  }

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      duration: duration,
      id: id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id: id, dismiss: dismiss, update: update };
}

/**
 * React hook that subscribes to the global toast state.
 * @returns {{ toasts: object[], toast: Function, dismiss: Function }}
 */
function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast: toast,
    dismiss: (toastId) =>
      dispatch({ type: "DISMISS_TOAST", toastId: toastId }),
  };
}

import { ToastProvider } from "@/components/ui/toast";

export {
  ToastProvider,
  reducer,
  toast,
  useToast,
};
