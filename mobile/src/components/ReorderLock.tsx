import { createContext, useContext } from 'react';

/**
 * While a screen is being rearranged, the controls inside the blocks stop
 * working.
 *
 * This exists because of one specific failure. Rearranging is entered by
 * holding a block — including a block that is entirely made of buttons, like
 * the subject grid. React Native has no gesture arbitration between a parent
 * and a child without react-native-gesture-handler, so the child button is
 * already the responder by the time the hold is recognised, and letting go
 * would fire its press: hold Pathology to rearrange, release, and Pathology
 * opens.
 *
 * Blocking the press at the one place every press in this app goes through is
 * the whole fix. `Touchable` reads this and ignores the press while it is set.
 * The alternative — passing an `editing` flag into every onPress on the Home
 * screen — is the same fix spread across twenty call sites, where missing one
 * is invisible until someone holds that exact control.
 *
 * Nothing provides this outside the reorderable region, so every other
 * Touchable in the app reads a constant and never re-renders for it.
 */
export const ReorderLockContext = createContext(false);

export function useReorderLocked(): boolean {
  return useContext(ReorderLockContext);
}
