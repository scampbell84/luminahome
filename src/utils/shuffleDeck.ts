/**
 * Smart Non-Repeating Shuffle Deck Utility
 * Ensures all photos are seen once in a random order before any photo repeats,
 * and seamlessly incorporates new photos as they stream in from background sync.
 */

/**
 * Creates a new Fisher-Yates shuffled array of photo indices [0 ... length-1].
 * Optionally avoids having avoidFirstIndex as the very first element (prevents
 * back-to-back repeats when cycling from the end of one cycle to the start of the next).
 */
export function createShuffledDeck(length: number, avoidFirstIndex?: number): number[] {
  if (length <= 0) return [];
  const deck = Array.from({ length }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }

  // If the first element matches avoidFirstIndex and there are multiple elements, swap it with another position
  if (avoidFirstIndex !== undefined && deck.length > 1 && deck[0] === avoidFirstIndex) {
    const swapTarget = 1 + Math.floor(Math.random() * (deck.length - 1));
    const temp = deck[0];
    deck[0] = deck[swapTarget];
    deck[swapTarget] = temp;
  }

  return deck;
}

/**
 * Smoothly expands an active shuffle deck when new photos arrive via progressive background sync.
 * Preserves the already-played history (0 ... currentPosition) and randomly distributes
 * the newly arrived photo indices into the unplayed remainder (currentPosition + 1 ... end).
 */
export function expandShuffledDeck(
  currentDeck: number[],
  currentPosition: number,
  newTotalLength: number
): number[] {
  const oldLength = currentDeck.length;
  if (newTotalLength <= oldLength) return currentDeck;

  // New indices that haven't been in the deck yet
  const newIndices = Array.from({ length: newTotalLength - oldLength }, (_, i) => oldLength + i);

  // Shuffle the incoming batch
  for (let i = newIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newIndices[i];
    newIndices[i] = newIndices[j];
    newIndices[j] = temp;
  }

  // Slice history that has already been played
  const played = currentDeck.slice(0, currentPosition + 1);
  const unplayed = currentDeck.slice(currentPosition + 1);

  // Combine unplayed with new indices and shuffle them together
  const combinedUnplayed = [...unplayed, ...newIndices];
  for (let i = combinedUnplayed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = combinedUnplayed[i];
    combinedUnplayed[i] = combinedUnplayed[j];
    combinedUnplayed[j] = temp;
  }

  return [...played, ...combinedUnplayed];
}
