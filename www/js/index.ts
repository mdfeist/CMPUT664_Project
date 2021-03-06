///<reference path="index.d.ts" />
import { createTable, createTable2, makeCSVLink } from "./project-view";
import DataView from './data-filter';
import ManageAuthorsPanel from './manage-author-panel';


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

type EntityType = 'Declarations' | 'Types' | 'Invocations';

function fetchProject(type: EntityType): Promise<Project> {
  return new Promise(function (resolve, reject) {
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (xhttp.readyState === 4 && xhttp.status == 200) {
        let project: Project = JSON.parse(xhttp.responseText);
        resolve(project);
      } else if (xhttp.readyState === 4) {
        reject(new Error(`bad http status: ${xhttp.status}`));
      }
    };

    xhttp.open('GET', `get_project?type=${type}`, true);
    xhttp.send();
  });
}

function loadProject(type: EntityType) {
  fetchProject(type).then(project => {
    let filter = getFilters();
    let results = createTable(project, filter);
    patchInputs(results);

    var link = makeCSVLink(results);
    $('#csv-link').attr('href', link);
  });
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

  /* TODO: deprecate! */
  /* Find enabled authors. */
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

  if (!$authors.hasClass('collapse')) {
    /* Open the author mananagment panel. */
    let panel =
      new ManageAuthorsPanel((<any>window).CONFIG, $('#authors-list'));
    panel.renderAuthorPicker();
  } else {
    /* Close the author managment panel. This usually requires a redraw. */
    window.redrawTable();
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
