import assert from './assert.js';

/**
 * A bunch of random utilities I had no idea what to do with.
 */


/**
 * Returns the first element of an array. Complains bitterly if the array is
 * empty.
 */
export function first(array) {
  assert(array instanceof Array);
  if (array.length < 1) {
    throw new Error('Cannot get the first item of an empty array; is the project empty?');
  }
  return array[0];
}

/**
 * Returns the last element of an array. Complains bitterly if the array is
 * empty.
 */
export function last(array) {
  assert(array instanceof Array);
  if (array.length < 1) {
    throw new Error('Cannot get the first item of an empty array; is the project empty?');
  }
  return array[array.length - 1];
}
