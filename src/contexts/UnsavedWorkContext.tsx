import React, { createContext, useCallback, useContext, useEffect, useId, useRef } from 'react';

/**
 * Work a person has half done on the screen, which nothing has saved yet.
 *
 * Changing the store at the top reloads the whole app -- the blunt but certain way to make every
 * screen show the new store. A count sheet with twenty rows typed into it, a pick walk half
 * ticked, a move waiting for a shelf: all of it went, with no warning and no way back.
 *
 * A screen with work in hand says so here. The store picker asks before it throws it away. Screens
 * that keep nothing (an ordinary list) say nothing, and switching stays instant.
 *
 * Deliberately a ref, not state: claiming or releasing must never re-render the screen doing the
 * work, and nothing reads the list except at the moment somebody tries to switch.
 */
type Claims = Map<string, string>;

const UnsavedWorkContext = createContext<{
  claim: (id: string, label: string) => void;
  release: (id: string) => void;
  /** What is in hand right now, or null. The first claim is enough: one sentence is what we ask with. */
  inHand: () => string | null;
} | undefined>(undefined);

export const UnsavedWorkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const claims = useRef<Claims>(new Map());
  const claim = useCallback((id: string, label: string) => { claims.current.set(id, label); }, []);
  const release = useCallback((id: string) => { claims.current.delete(id); }, []);
  const inHand = useCallback(() => {
    const first = claims.current.values().next();
    return first.done ? null : first.value;
  }, []);
  return <UnsavedWorkContext.Provider value={{ claim, release, inHand }}>{children}</UnsavedWorkContext.Provider>;
};

/** Read by the store picker. Safe outside the provider: then there is never anything to lose. */
export const useUnsavedWorkRegistry = () => useContext(UnsavedWorkContext) ?? { claim: () => {}, release: () => {}, inHand: () => null };

/**
 * Say that this screen is holding work while `active` is true.
 *
 *   useUnsavedWork(Object.keys(counts).length > 0, 'a count of FLOOR-C1-1 that is not saved yet');
 *
 * The label finishes the sentence "Changing the store will throw away ___", so write it as a thing,
 * not as an instruction.
 */
export function useUnsavedWork(active: boolean, label: string) {
  const { claim, release } = useUnsavedWorkRegistry();
  const id = useId();
  useEffect(() => {
    if (!active) { release(id); return; }
    claim(id, label);
    return () => release(id);
  }, [active, label, id, claim, release]);
}
