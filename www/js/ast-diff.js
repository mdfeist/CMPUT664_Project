import assert from './assert.js';

const EDIT_KIND = ['+', '-'];

/**
 * Class: ASTDiff
 *
 * Instantiated with an original data object.
 */
export default class ASTDiff {
  constructor(original, commit) {
    assert(commit.commitID === original.commitID);
    assert(typeof original.type === 'string');
    assert(EDIT_KIND.includes(original.edit));

    this.type = original.type;
    this.edit = original.edit;
    this._commit = commit;
  }

  /**
   * Create an ASTDiff using the information in the commit map.
   * A commit map maps the Git SHA to the commit contents themselves.
   */
  static withCommitMap(commits, diff) {
    return new ASTDiff(diff, commits[diff.commitID]);
  }

  /**
   * Delegate valueOf() to the internal date object. This makes relational
   * comparisons with ASTDiff objects equivillent to comparing their dates.
   * (i.e.,
   *    (ASTDiff(...) < ASTDiff(...)) ===
   *        (ASTDiff(...).date < ASTDiff(...)))
   *
   * Coercing this to a primitive (such as when comparing or sorting ASTDiffs)
   * will result in a number representing the time of the ASTDiff.
   */
  valueOf() {
    return this.date.valueOf();
  }

  get isAdd() {
    return this.edit === '+';
  }

  get isRemove() {
    return this.edit === '-';
  }

  /**
   * The commit's author.
   *
   * NOTE: This was an enumerable property in an older version. This is
   * probably unnecessary now.
   */
  get author() {
    return this._commit.author;
  }

  /**
   * The commit's date.
   */
  get date() {
    return this._commit.date;
  }

  /**
   * Get the raw commit info.
   */
  get commit() {
    return this._commit;
  }

  /**
   * The Git commit ID.
   */
  get sha() {
    return this._commit.commitID;
  }

  /**
   * Files modified in this commit.
   */
  get filesModified() {
    return this._commit.files;
  }

  /**
   * All files present at this point in time.
   */
  get allFiles() {
    return this._commit.all_files;
  }

  /**
   * Log message of the commit associated with this ASTDiff.
   */
  get commitMessage() {
    return this._commit.message;
  }
}
