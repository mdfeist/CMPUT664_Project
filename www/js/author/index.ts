import AuthorIdentity from './author-identity';
import AuthorConfiguration from './configuration';

export { AuthorConfiguration, AuthorIdentity };

/**
 * Represents one verified full author.
 */
export default class Author {
  constructor(public primaryIdentity: AuthorIdentity) {
  }

  /**
   * The author's name.
   * @return {string} [description]
   */
  get name(): string {
    return this.primaryIdentity.name;
  }

  /**
   * The author's email.
   * @return {string} [description]
   */
  get email(): string {
    return this.primaryIdentity.email;
  }

  /**
   * An idenitification string, suitable for mapping back to the author.
   * @return {string} [description]
   */
  get id(): string {
    return this.shorthand;
  }

  get shorthand(): string {
    return this.primaryIdentity.shorthand;
  }

  toString(): string {
    return `Author(${JSON.stringify(this.id)})`;
  }
}
