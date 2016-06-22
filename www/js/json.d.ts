/**
 * @file
 * Declares the structure of the JSON file as sent by
 * the Flask web server.
 */

/**
 * The JSON sent from the Flask server to the client.
 */
declare interface Project {
  commits: CommitFromJSON[];
  dates: Edit[];
  types: string[];
  authors: string[];
}

interface CommitFromJSON {
  /**
   * The raw author string, normalized as
   *
   * 		Name <email@domain.tld>
   *
   * @type {string}
   */
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

/**
 * An individual addition or deletion, as given by the server.
 */
interface Edit {
  commitID: CommitID;
  edit: EditKind;
  type: string;
}

/**
 * Indicates whether an edit is an addition or a deletion.
 * @type {String}
 */
type EditKind = '+' | '-';

/**
 * A commit within the system.
 */
interface Commit extends CommitFromJSON {
  /**
   * The commit date in UTC.
   * @type {Date}
   */
  date: Date;
}

/**
 * Type alias for a string that uniquly identifies a commit.
 * @type {[type]}
 */
type CommitID = string;

/**
 * Maps a commit SHA to a commit.
 */
interface CommitMap {
  [commitID: string]: Commit;
}
