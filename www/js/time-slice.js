import ASTDiff from './ast-diff.js';

/**
 * Class: TimeSlice
 * A slice of time, with a start date and an end date.
 * Contains file coverage and
 *
 * Create an array of these and you get an x-axis!
 */
export default class TimeSlice {
  constructor(start, end) {
    assert(start instanceof Date);
    assert(end instanceof Date);
    this.startDate = start;
    this.endDate = end;

    this._typeCount = null;

    this._diffs = [];
  }

  /**
   * Add a diff. This carries:
   *  - an author
   *  - a commit
   *  - files
   */
  addDiff (diff) {
    assert(diff instanceof ASTDiff);
    this._diffs.push(diff);
  }

  get cumulativeTypeCount () {
    if (this._typeCount === null) {
      throw new Error('Did not explicitly set cumulativeTypeCount!');
    }
    return this._typeCount;
  }

  /**
   * Only permits the cumulative type count to be set as a number, as well as
   * ensuring it's a number.
   */
  set cumulativeTypeCount (value) {
    if (this._typeCount !== null) {
      throw new Error('cumulativeTypeCount can only be set once!');
    }
    if (typeof value !== 'number') {
      throw new Error('cumulativeTypeCount must be a number!');
    }
    return this._typeCount = value;
  }

  /**
   * Given start and end dates, calls the given callback with the start and end
   * date.
   */
  static createRange(start, end, step) {
    var currentStart;
    var currentEnd = end;
    var array = [];

    while (start < currentEnd) {
      currentStart = moment(currentEnd);

      switch (step) {
          case 'hour':
              currentStart.subtract(1, 'hour');
              break;
          case 'day':
              currentStart.subtract(1, 'day');
              break;
          case 'week':
              /* TODO: Make this smarter? */
              currentStart.subtract(1, 'weeks');
              break;
          case 'month':
              currentStart.subtract(1, 'month');
      }

      currentStart = currentStart.toDate();
      array.push(new TimeSlice(currentStart, currentEnd));
      currentEnd = currentStart;
    }

    /* Such that the timeslices are in ascending chronological order. */
    return array.reverse();
  }
}
