import Author, {AuthorIdentity} from './';

/**
 * Configuration for authors.
 */
export default class AuthorConfiguration {
  private _enabled = new WeakSet<Author>();
  private _aliases = new Map<AuthorIdentity, Author>();
  private _known = new Set<Author>();

  constructor({aliases, enabled}: ConfigurationJSON) {
    /* Add all aliases. */
    for (let name of Object.keys(aliases)) {
      this._mapTo(name, aliases[name]);
    }

    /* Enable all authors explicitly. */
    for (let name of enabled) {
      let author = this.getAuthorByName(name);
      this.enable(author);
    }
  }

  get authors(): Set<Author> {
    return new Set(this._known);
  }

  get aliases(): Iterable<AuthorIdentity> {
    return this._aliases.keys();
  }

  getAuthorByName(name: string): Author {
    let alias = AuthorIdentity.get(name);
    return this.get(alias);
  }

  get(alias: AuthorIdentity): Author {
    let author = this._aliases.get(alias);

    if (!author) {
      throw new Error(`Author not known: ${alias}`);
    }

    return author;
  }

  enable(author: Author): void {
    this._enabled.add(author);
  }

  disable(author: Author): void {
    this._enabled.delete(author);
  }

  /**
   * True if the ID is a primary identity of some author.
   */
  isPrimaryIdentity(id: AuthorIdentity): boolean {
    let author = this.get(id);
    return author.primaryIdentity === id;
  }

  addAlias(alias: AuthorIdentity, author: Author) {
    let existingMapping: Author = this._aliases.get(alias)

    /* Check if we're remapping an existing alias. */
    if (existingMapping && existingMapping.primaryIdentity !== alias) {
      throw new Error(`Alias already mapped: ${alias.shorthand} => ${existingMapping.shorthand}`);
    }

    this._aliases.set(alias, author);
  }

  isEnabled(author: Author): boolean {
    return this._enabled.has(author);
  }

  /**
   * Maps an alias name to an author.
   */
  protected _mapTo(aliasName: string, authorName: string) {
    let alias = AuthorIdentity.get(aliasName);
    let primaryIdentity = AuthorIdentity.get(authorName);
    let author = this._vivifyAuthor(primaryIdentity);

    this.addAlias(alias, author);
  }

  protected _vivifyAuthor(id: AuthorIdentity): Author {
    let author = this._aliases.get(id);

    if (!author) {
      author = new Author(id);
      this._known.add(author);
      this.addAlias(id, author);
    }

    return author;
  }
}

interface ConfigurationJSON {
  aliases: { [name: string]: string };
  enabled: string[];
}
