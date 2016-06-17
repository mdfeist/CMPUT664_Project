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

interface Commit {
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
  date: string;

  /**
   * The log message.
   * @type {string}
   */
  message: string;

  files: any[];
  all_files: any[];
}

declare interface Project {
  commits: Commit[];
  dates: Edit[];
}
