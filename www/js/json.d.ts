type EditKind = '+' | '-';
/**
 * Type alias for a string that uniquly identifies a commit.
 * @type {[type]}
 */
type CommitID = string;

interface Edit {
  commitID: CommitID;
  edit: EditKind;
  type: string;
}

interface CommitFromJSON {
  author: string;
  /**
   * The Git SHA. Should be unique per project.
   * @type {string}
   */
  commitID: CommitID;

  /**
   * Date, formatted as an ISO 8601 string.
   * @type {string}
   */
  date: string | Date;

  /**
   * The log message.
   * @type {string}
   */
  message: string;

  files: string[];
  all_files: string[];
}

interface Commit extends CommitFromJSON {
  /**
   * The commit date in UTC.
   * @type {Date}
   */
  date: Date;
}

interface CommitMap {
  [commitID: string]: Commit;
}

declare interface Project {
  commits: Commit[];
  dates: Edit[];
  types: string[];
}
