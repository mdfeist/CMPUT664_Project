///<reference path="index.d.ts" />
import { createTable, createTable2, makeCSVLink } from "./project-view";
import DataView from './data-filter';
import Author from './author';

/* Add date picker widgets on platforms that don't have them. */
if (!hasDatePicker()) {
  $('input[type="date"]').datepicker();
}

start();

function start() {
  var type = $("#type-select").val();
  loadProject(type);

  // Automatically reload the project data when the type select is changed.
  $("#type-select").on("change", function () {
    var type = $("#type-select").val();
    loadProject(type);
  });
}

/* Stolen from: http://stackoverflow.com/a/10199306 */
function hasDatePicker() {
  var input = document.createElement('input');
  input.setAttribute('type','date');

  var notADateValue = 'not-a-date';
  input.setAttribute('value', notADateValue);

  return (input.value !== notADateValue);
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

/**
 * Renders the author panel.
 * @return {string} HTML for the authors panel.
 */
function renderAuthorPanel(allAuthors: string[], authorUnsafe: string): string {
  /* TODO: take in a data structure describing author configuration. */
  let author = escapeHTML(authorUnsafe);

  return (`
    <li>
    <div class="panel panel-default author-configuration">
      <div class="panel-heading"> ${author} </div>
      <div class="panel-body">
        <label><input type="checkbox" checked
                      class="author-check-box"
                      value="${author}">
          Show this author
        </label>
        <label> Author aliases <br>
          <select multiple class="author-aliases">
            ${allAuthors.filter(name => name != author).map(unsafe =>
                `<option value="${unsafe}">${escapeHTML(unsafe)}</option>`
            )}
          </select>
        </label>
      </div>
    </div>
    </li>
  `);
}

/**
 * Rerenders the list inside #authors-list
 * @return {[type]} [description]
 */
function renderAuthorPicker() {
  let authors = window.authors;
  let html = authors.map(renderAuthorPanel.bind(window, authors)).join('');
  $('#authors-list').html(html);

  /* Enable chosen: */
  $('select.author-aliases').chosen();
}

function loadProject(type: 'Declarations' | 'Types' | 'Invocations') {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      var filter = getFilters();
      var project: Project = JSON.parse(xhttp.responseText);
      var results = createTable(project, filter);
      patchInputs(results);


      var link = makeCSVLink(results);
      $('#csv-link').attr('href', link);
    }
  };

  xhttp.open('GET', `get_project?type=${type}`, true);
  xhttp.send();
}

window.redrawTable = function () {
  var filter = getFilters();
  createTable2(filter);
}

function getFilters(): Filter {
  var startDate: Date = null;
  var endDate: Date = null;

  var timestamp = Date.parse($("#min-datepicker").val())
  if (isNaN(timestamp) == false) {
    startDate = new Date(timestamp);
  }

  timestamp = Date.parse($("#max-datepicker").val())
  if (isNaN(timestamp) == false) {
    endDate = new Date(timestamp);
  }

  var _authors: string[] = [];

  $('.author-check-box').each(function() {
    if($(this).prop('checked')) {
      _authors.push($(this).val());
    }
  });

  var typeFilter = $('#type-filter').val();

  return {
    start: startDate,
    end: endDate,
    stepSize: $("#step").val(),
    limit: +$("#filter").val(),
    authors: _authors,
    typeFilter: typeFilter
  };
}

/* Given the fully processed and filtered results, patches the inputs on
 * the page (specifically, the date inputs) with the correct dates. */
function patchInputs(results: DataView) {
  var maxDate = toISODate(results.absoluteMaxDate);
  var minDate = toISODate(results.absoluteMinDate);

  /* Set the min and max ranges on the components. */
  $('#min-datepicker').attr('min', minDate);
  $('#max-datepicker').attr('min', minDate);
  $('#min-datepicker').attr('max', maxDate);
  $('#max-datepicker').attr('max', maxDate);

  /* Patch the actual values. */
  $('#min-datepicker').val(minDate);
  $('#max-datepicker').val(maxDate);

  function toISODate(date: Date) {
    return date
      .toISOString()
      .split('T')[0];
  }
}

window.toggleView = function () {
  $("#dna-table").toggleClass('collapse');
  $("#stats-table").toggleClass('collapse');
}

window.toggleAuthors = function () {
  let $authors = $("#authors");
  $authors.toggleClass('collapse');

  /* Chosen must be enabled while the panel is visible. */
  if (!$authors.hasClass('collapse')) {
    renderAuthorPicker();
  }
}

window.toggleStats = function () {
  $("#stats").toggleClass('collapse');
}

window.toggleFilters = function () {
  $("#filters").toggleClass('collapse');
}

window.uncheckAuthors = function () {
  $('.author-check-box').prop('checked', false);
}
