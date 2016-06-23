import {AuthorIdentity} from './author';

export default Commit;

/**
 * A commit within the system.
 */
interface Commit extends CommitCommon {
  /**
   * The commit date in UTC.
   * @type {Date}
   */
  date: Date;
  author: AuthorIdentity;
}

/**
 * Maps a commit SHA to a commit.
 */
export interface CommitMap {
  [commitID: string]: Commit;
}
