import assert from './assert';
import ASTDiff from './ast-diff';

/**
 * Class: TimeSlice
 * A slice of time, with a start date and an end date.
 * Contains file coverage and
 *
 * Create an array of these and you get an x-axis!
 */
export default class TimeSlice {
  private _typeCount: number;
  private _diffs: Array<ASTDiff>;

  constructor(public startDate: Date, public endDate: Date) {
    this._typeCount = null;

    this._diffs = [];
  }

  /**
   * Add a diff. This carries:
   *  - an author
   *  - a commit
   *  - files
   */
  addDiff (diff: ASTDiff) {
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
  set cumulativeTypeCount (value: number) {
    if (this._typeCount !== null) {
      throw new Error('cumulativeTypeCount can only be set once!');
    }
    this._typeCount = value;
  }

  /**
   * Given start and end dates, calls the given callback with the start and end
   * date.
   */
  static createRange(start: Date, end: Date, step: StepSize) {
    var currentEnd = end;
    var array: TimeSlice[] = [];

    while (start < currentEnd) {
      let currentStart = moment(currentEnd);

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

      let lowerBound = currentStart.toDate();
      array.push(new TimeSlice(lowerBound, currentEnd));
      currentEnd = lowerBound;
    }

    /* Such that the timeslices are in ascending chronological order. */
    return array.reverse();
  }
}
/*global moment*/
