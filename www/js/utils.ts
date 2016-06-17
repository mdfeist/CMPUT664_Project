/**
 * A bunch of random utilities I had no idea what to do with.
 */

/**
 * Returns the first element of an array. Complains bitterly if the array is
 * empty.
 */
export function first<T>(array: T[]): T {
  if (array.length < 1) {
    throw new Error('Cannot get the first item of an empty array; is the project empty?');
  }
  return array[0];
}

/**
 * Returns the last element of an array. Complains bitterly if the array is
 * empty.
 */
export function last<T>(array: T[]): T {
  if (array.length < 1) {
    throw new Error('Cannot get the first item of an empty array; is the project empty?');
  }
  return array[array.length - 1];
}

/**
 * Add all items from the iterable to the set.
 */
export function union<T>(set: Set<T>, iterable: Iterable<T>): Set<T> {
  for (var item of iterable) {
    set.add(item);
  }
  return set;
}
