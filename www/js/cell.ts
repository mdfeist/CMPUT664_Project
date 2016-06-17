import assert from './assert';
import ASTDiff from './ast-diff';
import JavaType from './java-type';

/**
 * Class: Cell
 *
 * Represents the data for a single cell in the table.  The data is a number
 * of observations, which are either additions or deletions.
 */
export default class Cell {
  startDate: Date;
  endDate: Date;
  diffs: Array<ASTDiff>;

  constructor(start: Date, until: Date, public type: string) {
    /* Instantiate a new Cell object if called without `new`. */
    if (!(this instanceof Cell)) {
      return new Cell(start, until, type);
    }

    this.diffs = [];
    this.startDate = start;
    this.endDate = until;
    this.type = type;
  }

  /**
   * Adds a single diff.
   */
  addDiff(diff: ASTDiff) {
    assert(diff instanceof ASTDiff);
    assert(this.isAcceptableDiff(diff));
    assert(diff.type === this.type);
    this.diffs.push(diff);
    return this;
  }

  isAcceptableDiff (diff: any) {
    if (diff instanceof ASTDiff) {
      /* Chrome V8 will bail-out of optimizing this function if you compare
       * the dates directly (non-primitive compare);
       * instead, compare the valueOf()s, since this ends up being a Number
       * time value (see ECMA-262 5.1 §15.9.1.1), which it will gladly
       * generate native code for.  */
      return this.startDate.valueOf() <= diff.date.valueOf() &&
        diff.date.valueOf() <= this.endDate.valueOf();
    } else {
      return false;
    }
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

/*globals d3*/
