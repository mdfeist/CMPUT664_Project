import Author, {AuthorIdentity, AuthorConfiguration} from './author';

import assert from './assert';

type Selector = string | Node | JQuery;

export default class ManageAuthorsPanel {
  protected $element: JQuery;
  protected aliases: AuthorIdentity[];
  protected similaritySet = new Map<AuthorIdentity, Set<string>>();

  constructor(protected config: AuthorConfiguration, element: Selector) {
    this.$element = $(element);
    this.aliases = Array.from(config.aliases).sort(byShorthand);

    this.createSimilaritySets();

    function byShorthand(a: AuthorIdentity, b: AuthorIdentity) {
      return a.shorthand.toLowerCase() < b.shorthand.toLowerCase() ? -1 : 1;
    }
  }

  protected similarityTo(aId: AuthorIdentity) {
    let a = this.similaritySet.get(aId);
    return (bId: AuthorIdentity) => {
      let b = this.similaritySet.get(bId);
      return 1.0 - jaccard(a, b);
    };
  }

  protected createSimilaritySets() {
    assert(this.aliases instanceof Array);

    for (let id of this.aliases) {
      let characters = id.name + id.email.split('@')[0];
      this.similaritySet.set(id, new Set(characters));
    }
  }

  /**
   * Renders the author panel.
   * @return {string} HTML for the authors panel.
   */
  protected renderAuthorPanel = (id: AuthorIdentity): string => {
    let authorName = escapeHTML(id.shorthand);
    let author = this.config.get(id);
    let isPrimary = id === author.primaryIdentity;
    let controlDisabled = !isPrimary;
    let isEnabled = this.config.isEnabled(author);

    /* Poor man's React: */
    return (`
      <li>
      <div class="panel panel-default author-configuration ${controlDisabled ? 'disabled' : ''}">
        <div class="panel-heading"> ${id.name} &lt;<span class="sensitive">${id.email}</span>&gt; </div>
        <div class="panel-body">
          <label><input type="checkbox"
                        ${isEnabled ? 'checked' : ''}
                        class="author-check-box"
                        ${controlDisabled ? 'disabled' : ''}
                        value="${escapeHTML(id.shorthand)}">
            Show this author
          </label>
          <label> Author aliases <br>
            <select
              multiple
              class="author-aliases"
              data-placeholder="No duplicates for this author"
              ${controlDisabled ? 'disabled' : ''}
              name="${escapeHTML(author.id)}"
            >
              ${this.makeOptions(author)}
            </select>
          </label>
        </div>
      </div>
      </li>
    `);
  }

  protected makeOptions(author: Author): string {
    let options = this.aliases
      .filter(alias => alias !== author.primaryIdentity);

    return sortBy(options, this.similarityTo(author.primaryIdentity))
      .map(alias => {
        let isForThisAuthor = this.config.get(alias) === author;
        let isPrimaryForOther = this.config.isPrimaryIdentity(alias);

        return (
          `<option
            ${isForThisAuthor ? 'selected' : ''}
            ${isPrimaryForOther || isForThisAuthor  ? '' : 'disabled'}
            value="${escapeHTML(alias.shorthand)}"
          >
            ${escapeHTML(alias.shorthand)}
          </option>`
        );
      })
      .join('');
  }

  render() {
    let html = this.aliases
      .map(this.renderAuthorPanel)
      .join('');
    this.$element.html(html);
    this.configureInteraction();
  }

  configureInteraction(): void {
    /* Enable chosen: */
    this.$element.find('select.author-aliases').chosen()
      .change((evt, {selected, deselected}) => {
        let element = evt.target as HTMLSelectElement;
        let author = this.config.getAuthorByName(element.name);

        if (selected) {
          let alias = AuthorIdentity.get(selected);
          this.config.addAlias(alias, author);
        } else {
          assert(deselected);
          let alias = AuthorIdentity.get(deselected);
          this.config.removeAlias(alias);
        }

        this.render();
      })
  }

  renderAuthorPicker(): this {
    this.render();
    return this;
  }
}

/* From: http://stackoverflow.com/a/6234804 */
function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function jaccard<T>(a: Set<T>, b: Set<T>): number {
  let numItemsInCommon = itemsInCommon(a, b);
  return numItemsInCommon / (a.size + b.size - numItemsInCommon);
}

function itemsInCommon<T>(a: Set<T>, b: Set<T>): number {
  let count = 0;
  for (let item of a) {
    if (b.has(item)) {
      count++;
    }
  }

  return count;
}

function sortBy<T, U>(arr: T[], mapper: (item: T) => U): T[] {
  let paired = arr.map((item: T) => [mapper(item), item] as [U, T]);
  paired.sort(([a,], [b,]) => {
    return a === b ? 0 : a < b ? -1 : 1;
  });
  return paired.map(([_, item]) => item);
}
