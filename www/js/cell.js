import assert from './assert.js';
import ASTDiff from './ast-diff.js';

/**
 * Class: Cell
 *
 * Represents the data for a single cell in the table.  The data is a number
 * of observations, which are either additions or deletions.
 */
export default class Cell {
  constructor(start, until, type) {
    /* Instantiate a new Cell object if called without `new`. */
    if (!(this instanceof Cell)) {
      return new Cell(start, until, type);
    }

    assert(start instanceof Date);
    assert(until instanceof Date);
    assert(typeof type === 'string');

    this.diffs = [];
    this.startDate = start;
    this.endDate = until;
    this.type = type;
  }

  /**
   * Adds a single diff.
   */
  addDiff(diff) {
    assert(diff instanceof ASTDiff);
    assert(this.isAcceptableDiff(diff));
    assert(diff.type === this.type);
    this.diffs.push(diff);
    return this;
  }

  isAcceptableDiff (diff) {
    if (!(diff instanceof ASTDiff)) {
      return false;
    }

    /* Chrome V8 will bail-out of optimizing this function if you compare
     * the dates directly (non-primitive compare);
     * instead, compare the valueOf()s, since this ends up being a Number
     * time value (see ECMA-262 5.1 §15.9.1.1), which it will gladly
     * generate native code for.  */
    return this.startDate.valueOf() <= diff.date.valueOf() &&
      diff.date.valueOf() <= this.endDate.valueOf();
  }

  /** True if the cell contains at least one AST diff.  */
  get hasData () {
    return this.diffs && (this.diffs.length > 0);
  }

  /** Number of observations. */
  get numberOfObservations () {
    return this.diffs.length;
  }

  /** Number of additions.  */
  get numberOfAdds () {
    return this.diffs.filter(function (diff) {
      return diff.isAdd;
    }).length;
  }

  /** Number of deletions.  */
  get numberOfDeletions () {
    return this.diffs.filter(function (diff) {
      return diff.isRemove;
    }).length;
  }

  /** Get set of authors */
  get authors () {
    var authors = d3.set();

    this.diffs.forEach( function (diff) {
      authors.add(diff.author);
    });

    return authors.values();
  }

  /** Get set of commit id's */
  get commits () {
    var commits = d3.set();

    this.diffs.forEach(function (diff) {
      commits.add(diff.sha);
    });

    return commits.values();
  }
}
