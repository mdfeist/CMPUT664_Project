///<reference path="index.d.ts" />
import { createTable, createTable2, makeCSVLink } from "./project-view";
import DataView from './data-filter';

/* Add date picker widgets on platforms that don't have them. */
if (!hasDatePicker()) {
  $('input[type="date"]').datepicker();
}

start();

function start() {
  var type = $("#type-select").val();
  loadProject(type);

  $("#type-select").on("change", function(){
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
  var start_date = null;
  var end_date = null;

  var timestamp = Date.parse($("#min-datepicker").val())
  if (isNaN(timestamp) == false) {
    start_date = new Date(timestamp);
  }

  timestamp = Date.parse($("#max-datepicker").val())
  if (isNaN(timestamp) == false) {
    end_date = new Date(timestamp);
  }

  var _authors = [];

  $('.author-check-box').each(function() {
    if($(this).prop('checked')) {
      _authors.push($(this).val());
    }
  });

  var typeFilter = $('#type-filter').val();

  return {
    start: start_date,
    end: end_date,
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
  $("#dna-table").toggleClass("collapse");
  $("#stats-table").toggleClass("collapse");
}

window.toggleAuthors = function () {
  $("#authors").toggleClass( "collapse" );
}

window.toggleStats = function () {
  $("#stats").toggleClass( "collapse" );
}

window.toggleFilters = function () {
  $("#filters").toggleClass( "collapse" );
}

window.uncheckAuthors = function () {
  $('.author-check-box').prop('checked', false);
}
