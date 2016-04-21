/**
 * Processes and draws the TypeDNA diagram.
 *
 * Authors:
 *  - Michael Fiest
 *  - Eddie Antonio Santos
 *  - Ian Watts
 */

import ASTDiff from './ast-diff.js';
import JavaType from './java-type.js';
import TimeSlice from './time-slice.js';

import { first, last } from './utils.js';

import assert from './assert.js';

var VALID_STEP_SIZES = d3.set(['hour', 'day', 'month', 'week']);

/* Shim the assert function in there! */

var CELL_INFO_WIDTH = 500;

/* Cell Info */
var cellInfo = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden")
  .style("width", String(CELL_INFO_WIDTH) + "px")
  .classed('panel panel-default', true);

cellInfo.append('div')
  .classed('panel-heading', true)
  .style("font-weight", "bold")
  .text('Info');


/* Draw table given JSON */
export function createTable(data, filter) {
  window.DATA = data;
  window.preprocessedData = preprocessData(window.DATA);

  return createTable2(filter);
}

window.createTable = createTable;

function createTable2(filter) {
  /* Plop this in dna-table div */
  var dnaTable = document.getElementById('dna-table');

  /* Clear previous table */
  dnaTable.innerHTML = "";

  var processed = window.preprocessedData;
  var data = window.filteredData = filterTypes(processed, filter);
  drawGraph(data, dnaTable.offsetWidth);
  drawStats(data, dnaTable.offsetWidth);

  return data;
}

/*=== Core functions ====*/

/**
 * Modifies original data.
 */
function preprocessData(data) {
  assert(data.types instanceof Array);
  assert(data.commits instanceof Array);
  assert(data.dates instanceof Array);

  /* A set of types. */
  var types = new Set(data.types);
  /* Mapping GitSha -> Commit Metadata. */
  var commits = createCommitMap(data.commits);

  return {
    types,
    commits,
    /* A copy of AST Diff data, in asscending order of date. */
    astDiffs: createASTDiffsInAscendingOrder(data.dates, commits)
  };
}

/* Maps Git SHA to the raw commit data. */
function createCommitMap (commits) {
  var commitMap = {};

  commits.forEach(function (commit) {
    var sha = commit.commitID;
    assert(looksLikeAGitSha(sha));
    commitMap[sha] = commit;
  });

  return commitMap;
}

/* Returns AST Diff data, in asscending order of date. */
function createASTDiffsInAscendingOrder(astDiffsByType, commits) {
  /* Ensure each commit has a proper Date object. */
  for (let sha in commits) {
    if (!commits.hasOwnProperty(sha)) {
      continue;
    }
    let commit = commits[sha];
    commit.date = new Date(commit.date);
  }

  return astDiffsByType
    .map(ASTDiff.withCommitMap.bind(ASTDiff, commits))
    /* Note: unary + coerces to smallint using Date#valueOf() */
    /* See explanation in Cell#isAcceptableDiff(). */
    .sort((a, b) => d3.ascending(+a.date, +b.date));
}

/**
 * Takes preprocessed data, and returns an array of types, in ascending order
 * of popularity.
 *
 * Each type has its Cells, with ASTDiffs.
 */
function filterTypes(data, filters) {
  /* Let filters be undefined or null. */
  filters = filters ? filters : {};

  /* Either the date provided, or the first date attested. */
  var startDate = filters.start || first(data.astDiffs).date;
  /* Either the date provided or the last date attested. */
  var endDate = filters.end || last(data.astDiffs).date;
  var numberOfTypesUpperBound = filters.limit || Infinity;
  var stepSize = filters.stepSize || 'month';
  var authors = filters.authors || [];
  var typeFilter = filters.typeFilter ? filters.typeFilter : null;

  assert(startDate instanceof Date);
  assert(endDate instanceof Date);
  assert(startDate < endDate);
  assert(typeof numberOfTypesUpperBound === 'number');
  assert(VALID_STEP_SIZES.has(stepSize));
  assert(authors instanceof Array);

  /* Find the range of diffs to use. */
  var lowerIndex = d3.bisectLeft(data.astDiffs, startDate);
  var upperIndex = d3.bisectRight(data.astDiffs, endDate);

  var applicableDiffs = data.astDiffs.slice(lowerIndex, upperIndex);
  /* Filter types, first by the types that are ACTUALLY present in the
   * filtered ASTDiffs */
  var typesPresent = countTypeAbsoluteFrequency(applicableDiffs);
  /* XXX: refactor... */
  var typeNames = typeFilter === null ? Object.keys(typesPresent) :
    Object.keys(typesPresent).filter(typeName => {
      return typeName.toLowerCase().includes(typeFilter.toLowerCase());
    });

  var sortedTypeNames = typeNames
    .sort((a, b) => d3.descending(typesPresent[a], typesPresent[b]))
    .slice(0, numberOfTypesUpperBound);

  assert(sortedTypeNames.length > 0);

  /* Create a list of each type. */
  var types = sortedTypeNames.map(JavaType);
  var typeMap = {};
  /* Map full type names to their type. */
  types.forEach(function (type) {
    typeMap[type.name] = type;
  });

  var authorMap = {};
  var authorSets = {};
  var typesOverall = new Set();
  var filesOverall = new Set();

  /* Create all cells applicable for display.  */
  var timeslices = TimeSlice.createRange(startDate, endDate, stepSize);

  timeslices.forEach(function (timeslice) {
    var startDate = timeslice.startDate;
    var endDate = timeslice.endDate;

    /* This will filter out only the applicable diffs. */
    var lowerIndex = d3.bisectLeft(applicableDiffs, startDate);
    var upperIndex = d3.bisectRight(applicableDiffs, endDate);
    var i, diff, type;

    /* For each applicable diff in the time range... */
    for (i = lowerIndex; i < upperIndex; i++) {
      diff = applicableDiffs[i];
      /* Count the type, regardless if it's filtered. */
      typesOverall.add(diff.type);

      type = typeMap[diff.type];

      /* The type must exist! */
      if (type === undefined) {
        continue;
      }

      /* Add the diff, accounting for author filters. */
      if (authors.length <= 0 || authors.indexOf(diff.author) != -1) {
        type.addDiff(diff, startDate, endDate);
        timeslice.addDiff(diff);
      }

    }

    /* Finally, commit the count to the timeslice. */
    timeslice.cumulativeTypeCount = typesOverall.size;
  });

  var minDate = first(timeslices).startDate;
  var maxDate = last(timeslices).endDate;
  assert(minDate <= maxDate);

  /* Will need to recalculate this for this measurement: */
  typesOverall = new Set();
  forEachCommit(applicableDiffs, (commit, files, types) => {
    var author = commit.author;
    var date = new Date(commit.date);
    if (!(author in authorMap)) {
      authorMap[author] = [];
      authorSets[author] = {
        files: new Set(),
        types: new Set()
      };
    }

    /* Add all observed files and types to their respective sets. */
    union(filesOverall, files);
    union(authorSets[author].files, files);
    union(typesOverall, types);
    union(authorSets[author].types, types);

    /* Record stats! */
    authorMap[author].push({
      type: {
        observed: types.size,
        cumulative: authorSets[author].types.size,
        total: typesOverall.size
      },
      file: {
        observed: files.size,
        cumulative: authorSets[author].files.size,
        total: filesOverall.size
      },
      date
    });
  });

  return {
    /* Filtered types. */
    types,
    /* All types, without arbitrary filtering or sorting. */
    allTypes: Object.keys(typesPresent),
    timeslices,
    minDate,
    maxDate,
    numberOfColumns: timeslices.length,
    /* The authors selected and seen. */
    authors: Object.keys(authorMap),
    authorStats: authorMap,
    numberOfTypes: typesOverall.size,
    numberOfFiles: filesOverall.size,
    /* The following two are used for the date display picker thing. */
    absoluteMinDate: first(data.astDiffs).date,
    absoluteMaxDate: last(data.astDiffs).date,
  };
}


/**
 * Count all types in the given ASTDiff objects.
 */
function countTypeAbsoluteFrequency(astDiffs) {
  var typesFrequency = {};
  astDiffs.forEach(function (diff) {
    var freq = typesFrequency[diff.type] || 0;
    typesFrequency[diff.type] = freq + 1;
  });

  return typesFrequency;
}



/**
 * TODO:
 *  - Calculate type and file coverage PER COMMIT.
 *  - Per each author, get their type/file coverage.
 *  - Put it in a CSV
 */


/**
 * Given diffs, calls the callback for each commit.
 * The callback is called with the raw commit, a set of files touched, and a
 * set of types type
 */
function forEachCommit(diffs, fn) {
  var currentCommit, filesOverall, typesOverall;

  for (var diff of diffs) {
    /* When encoutering a new commit... */
    if (currentCommit === undefined || currentCommit.commitID !== diff.sha) {
      /* Do the callback. */
      if (currentCommit !== undefined) {
        fn(currentCommit, filesOverall, typesOverall);
      }

      /* Reset the current commit. */
      currentCommit = diff.commit;
      typesOverall = new Set();
      filesOverall = new Set();
    }

    /* Update the types. */
    typesOverall.add(diff.type);

    for (var filename of diff.filesModified) {
      filesOverall.add(filename);
    }
  }
}


/*=== Graph ===*/

function drawGraph(data, width) {
  var marginLeft = 150;
  var cellHeight = 64;
  var height = cellHeight * data.types.length;

  /* Create a scale for the types i.e., the y-axis */
  var yScale = d3.scale.ordinal()
    .domain(data.types.map(type => type.fullyQualifiedName ))
    .rangeBands([0, height]);

  /* Create a scale for the dates i.e., the x-axis */
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .range([marginLeft, width]);

  var timeAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom');

  //var cellWidth = cellWidthFromScale(first(first(data.types).cells), xScale);
  var maxCellHeight = yScale.rangeBand() - 2;

  var svg = d3.select('#dna-table').append('svg')
      .classed('main-figure', true)
      .attr("width", width)
      .attr("height", height);

  var row = svg.selectAll('.row')
      .data(data.types)
    .enter().append('g')
      .classed('row', true)
      .attr('transform', (type) => `translate(0, ${yScale(type.fullyQualifiedName)})`);

  /* The background. */
  row.append('rect')
      .attr('x', marginLeft)
      .attr('width', width - marginLeft)
      .attr('height', maxCellHeight)
      .style('fill', function (d, i) {
        /* Make alternating colour bands. */
        return i&1 ? '#f4f4f4' : '#fafafa';
      });

  row.each(createCellsForType);

  row.append('text')
      .classed('type-title', true)
      .attr('y', yScale.rangeBand() / 2)
      .attr('dy', '.22em')
      .attr('x', `${marginLeft - 10}px`)
      .attr('text-anchor', 'end')
      .text(type => type.shortName );

  /* Add the time axis as a **new** SVG element, inserted BEFORE the main SVG
   * element.*/
  var floatingAxis = d3.select('#dna-table').insert('svg', '.main-figure')
      .classed('time-axis', true)
      .attr('width', width)
      /* Note: Height will be set with CSS. */
      .call(timeAxis);

  /* Make all text left-aligned, and bold all the years. */
  floatingAxis.selectAll("text")
      .attr("y", 6)
      .attr("x", 6)
      .style("text-anchor", "start")
      .classed('year-tick', function () {
        /* Matches if the text looks like a year. */
        var text = this.textContent;
        return text.match(/^\d{4,}$/);
      });

  ensureAxisIsAtGraphBottom(svg.node(), floatingAxis.node());

  function createCellsForType(type) {
    /* Create all the cells. */
    var cell = d3.select(this).selectAll('.cell')
      .data(type.cells)
      .enter().append('g')
        /* Only do cool things with cells that *HAVE* data! */
        .filter(function (cell) { return cell.hasData; })
        .classed('cell', true)
        .attr('transform', function (cell) {
          var yOffset = maxCellHeight * (1  - cell.numberOfObservations / type.numberOfObservationsInLargestCell);
          return 'translate(' + xScale(cell.startDate) + ', ' + yOffset + ')';
        });

    /* Make the deletion bar. */
    cell.append('rect')
      .classed('ast-deletions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      .attr('height', function (cell) {
        var proportion = cell.numberOfDeletions / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        return proportion * maxCellHeight * height;
      });

    /* Make the addition bar. */
    cell.append('rect')
      .classed('ast-additions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      .attr('transform', function (cell) {
        var proportion = cell.numberOfDeletions / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        var topHalf = proportion * maxCellHeight * height;

        return `translate(0, ${topHalf})`;
      })
      .attr('height', function (cell) {
        var proportion = cell.numberOfAdds / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        return proportion * maxCellHeight * height;
      });

    /* Mouse Click: Show Cell stats */
    cell.on("click", function(cell_data) {
      var stats = d3.select("#stats-body");
      stats.selectAll('.content').remove();

      var info = stats.append('div')
        .classed('content', true);

      info.append('b')
        .text("Info:");
      info.append('p')
        .text("Additions: " + cell_data.numberOfAdds);
      info.append('p')
        .text("Deletions: " + cell_data.numberOfDeletions);
      /* TODO: Graphs here! */
      info.append('p')
        .text("Authors: " + cell_data.authors.length);
      info.append('p')
        .text("Commits: " + cell_data.commits.length);

      info.append('br');

      info.append('b')
        .text("Authors:");

      cell_data.authors.forEach(function (author) {
        info.append('p')
          .text(author);
      });

      info.append('br');

      var commit_map = window.preprocessedData.commits;

      info.append('b')
        .text("Commits:");

      cell_data.commits.forEach(function (commitID) {
        var commit = commit_map[commitID];
        info.append('p')
          .text("Commit ID: " + commit.commitID);
        var block = info.append('div')
          .style('padding-left', '5em');
        block.append('p')
          .text("Author: " + commit.author);
        block.append('p')
          .text("Date: " + commit.date);
        block.append('p')
          .text("Message: ");

        var msg_block = block.append('div')
          .style('padding-left', '5em');

        var lines = commit.message.split("\n");
        lines.forEach(function (line) {
          msg_block.append('p')
          .text(line);
        });

        info.append('br');
      });
    });

    /* Mouse over: Show and update cell info */
    cell.on("mouseover", function(cell_data) {
      cellInfo.selectAll('ul').remove();
      var info = cellInfo.append('ul')
        .classed('list-group', true);

      info.append('li')
        .classed("list-group-item", true)
        .text("Type: " + cell_data.type);

      info.append('li')
        .classed("list-group-item", true)
        .text("Additions: " + cell_data.numberOfAdds);

      info.append('li')
        .classed("list-group-item", true)
        .text("Deletions: " + cell_data.numberOfDeletions);

      info.append('li')
        .classed("list-group-item", true)
        .text("Authors: " + cell_data.authors.length);

      info.append('li')
        .classed("list-group-item", true)
        .text("Commits: " + cell_data.commits.length);

      info.append('li')
        .classed("list-group-item", true)
        .text("Start Date: " + cell_data.startDate);
      info.append('li')
        .classed("list-group-item", true)
        .text("End Date: " + cell_data.endDate);

      var coords = d3.mouse(document.body);
      var currentx = coords[0];
      var currenty = coords[1];

      var x = currentx - CELL_INFO_WIDTH/2;

      if (x < 10) x = 10;
      if (x > width - CELL_INFO_WIDTH - 10) x = width - CELL_INFO_WIDTH -10;

      var y = currenty + maxCellHeight + 10;

      cellInfo.style('left', String(x) + "px");
      cellInfo.style('top', String(y) + "px");

      cellInfo.style("visibility", "visible");
    });

    /* Mouse move: Update position of cell info */
    cell.on("mousemove", function (_cell_data) {
      var coords = d3.mouse(document.body);
      var currentx = coords[0];
      var currenty = coords[1];

      var x = currentx - CELL_INFO_WIDTH/2;

      if (x < 10) x = 10;
      if (x > width - CELL_INFO_WIDTH - 10) x = width - CELL_INFO_WIDTH -10;

      var y = currenty + maxCellHeight + 10;

      cellInfo.style('left', String(x) + "px");
      cellInfo.style('top', String(y) + "px");
    });

    /* Mouse out: Hide cell info */
    cell.on("mouseout", function(_cell) {
      cellInfo.style("visibility", "hidden");
    });
  }
}

/**
 * Draws type coverage stats and things.
 */
function drawStats(data, width) {
  var marginLeft = 64;
  var overviewHeight = 480;
  var rowHeight = 64;
  var marginBottom = 32;

  var chartHeight = overviewHeight - marginBottom;

  /* Create a scale for the dates i.e., the x-axis */
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .range([marginLeft, width]);

  /* Make a scale for proportions that goes from bottom to top. */
  var yScale = d3.scale.linear()
    .domain([0, 1])
    .range([chartHeight, 0]);

  /* This one is used per author stats. */
  var yScaleSmall = d3.scale.linear()
    .domain([0, 1])
    .range([rowHeight, 0]);

  var timeAxis = d3.svg.axis()
    .scale(xScale)
    .outerTickSize(0) // Get rid of weird outer ticks.
    .orient('bottom');

  var verticalAxis = d3.svg.axis()
    .scale(yScale)
    .tickFormat(d3.format("5%"))
    .orient('left');

  /* Cumulative types over time. */
  var overviewSvg = d3.select('#types-over-time').append('svg')
      .classed('types-over-time', true)
      .attr("width", width)
      .attr("height", overviewHeight);

  var numberOfTypesTotal = data.numberOfTypes;
  var lineFunction = d3.svg.line()
    .x(timeslice => xScale(timeslice.startDate))
    .y(timeslice => yScale(timeslice.cumulativeTypeCount / numberOfTypesTotal))
    .interpolate('linear');

  /* Make the line chart. */
  overviewSvg.append('path')
    .classed('line-chart', true)
    .attr('d', lineFunction(data.timeslices));

  /* Add the axes. */
  overviewSvg.append('g')
    .classed('time-axis', true)
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(timeAxis);
  overviewSvg.append('g')
    .classed('y-axis', true)
    .attr('transform', `translate(${marginLeft}, 0)`)
    .call(verticalAxis);

  /* It gets ugly here... */
  var lineFunctionSmallFiles = d3.svg.line()
    .x(author => xScale(author.date))
    .y(author => {
      var proportion = author.file.cumulative / numberOfTypesTotal;
      return yScaleSmall(proportion);
    })
    .interpolate('linear');

  var lineFunctionSmallTypes = d3.svg.line()
    .x(author => xScale(author.date))
    .y(author => {
      var proportion = author.type.cumulative / numberOfTypesTotal;
      return yScaleSmall(proportion);
    })
    .interpolate('linear');

  /*
   * Per author stats.
   */

  var authorCoverage = d3.select('#coverage-by-author').selectAll('.author-coverage')
      .data(data.authors)
    .enter().append('svg')
      .attr('height', rowHeight + 32)
      .attr('width', width)
      .classed('author-coverage', true);

  authorCoverage.append('path')
    .classed('file-coverage', true)
    .attr('d', (authorName) => lineFunctionSmallFiles(data.authorStats[authorName]));

  authorCoverage.append('path')
    .classed('type-coverage', true)
    .attr('d', (authorName) => lineFunctionSmallTypes(data.authorStats[authorName]));

  /* Axes. */
  authorCoverage.append('g')
    .attr('transform', `translate(0, ${rowHeight})`)
    .call(timeAxis);

  authorCoverage.append('text')
    .attr('transform', `translate(${marginLeft}, 16)`)
    .text(authorName => authorName);

  /* TODO: Make independent axis for each author... */
  /*

  var verticalAxisSmall = d3.svg.axis()
    .scale(yScaleSmall)
    .tickFormat(d3.format("5%"))
    .orient('left');

  authorCoverage.append('g')
    .attr('transform', `translate(${marginLeft}, 0)`)
    .call(verticalAxisSmall);
  */
}

/**
 * Returns the download link for a CSV file (with header)
 * for per-author type and file coverage statistics.
 */
window.makeCSVLink = function makeCSVLink(data) {
  var lines = [];
  var filesTotal = data.numberOfFiles;
  var typesTotal = data.numberOfTypes;

  /* Add the header. */
  addRow('Metric', 'Author', 'Date', 'Coverage');

  for (var authorName of Object.keys(data.authorStats)) {
    for (var stats of data.authorStats[authorName]) {
      addRow(
        'file',
        authorName,
        +stats.date, // Coerce to Unix timestamp in ms
        stats.file.cumulative / filesTotal
      );
      addRow(
        'type',
        authorName,
        +stats.date, // Coerce to Unix timestamp in ms
        stats.type.cumulative / typesTotal
      );
    }
  }

  function addRow() {
    var i;
    for (i = 0; i < arguments.length; i++) {
      if (/[,"]/.exec(arguments[i]))
        throw new Error('Invalid char in:' + arguments[i]);
    }
    lines.push(Array.prototype.join.call(arguments, ','));
    lines.push('\n');
  }

  var blob = new Blob(lines, {type: 'text/csv'});

  return URL.createObjectURL(blob);
};

/**
 * Places the axis on the bottom of the graph on initial render, when the
 * screen is too big.
 */
function ensureAxisIsAtGraphBottom(graph, axis) {
  assert(graph instanceof SVGElement);
  assert(axis instanceof SVGElement);

  var paddingBottom = 60;
  var bottomOfGraph = graph.getBoundingClientRect().bottom;

  /* when the screen*/
  var shouldReposition = bottomOfGraph + paddingBottom < viewportHeight();

  if (shouldReposition) {
    /* Set to the height. */
    //axis.style.top = graph.getBoundingClientRect().height;;
    axis.classList.add('axis-on-bottom');
  } else {
    axis.classList.add('axis-floating');
  }
}

/**
 * http://stackoverflow.com/a/8876069
 */
function viewportHeight() {
  return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
}

/*=== Utilties ===*/

function cellWidthFromScale(cell, scale) {
  var bigger = scale(cell.endDate);
  var smaller = scale(cell.startDate);
  assert(bigger > smaller);
  /* Ensure it rounds up to remove horizontal gaps. */
  return Math.ceil(bigger - smaller) + 1;
}



/*=== Predicates used in assertions and checks ===*/

function looksLikeAGitSha(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  return thing.match(/^[0-9a-f]{5,}$/i);
}

/**
 * Union of two sets.
 */
function union(set, iterable) {
  for (var item of iterable) {
    set.add(item);
  }
  return set;
}

/*globals d3*/
