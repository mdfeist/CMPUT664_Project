import Author, {AuthorIdentity, AuthorConfiguration} from './author';

import assert from './assert';

type Selector = string | Node | JQuery;

export default class ManageAuthorsPanel {
  protected $element: JQuery;
  protected aliases: AuthorIdentity[];

  constructor(protected config: AuthorConfiguration, element: Selector) {
    this.$element = $(element);
    this.aliases = Array.from(config.aliases).sort(byShorthand);

    function byShorthand(a: AuthorIdentity, b: AuthorIdentity) {
      return a.shorthand.toLowerCase() < b.shorthand.toLowerCase() ? -1 : 1;
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
        <div class="panel-heading"> ${authorName} </div>
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
    return this.aliases
      .filter(alias => alias !== author.primaryIdentity)
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

  /**
   * Rerenders the list inside #authors-list
   * @return {[type]} [description]
   */
  renderAuthorPicker(): void {
    this.render();
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



