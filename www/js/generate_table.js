/**
 * Processes and draws the TypeDNA diagram.
 *
 * Authors:
 *  - Michael Fiest
 *  - Eddie Antonio Santos
 *  - Ian Watts
 */

/* Run right after the page (and this script) finishes loading. */
document.addEventListener('DOMContentLoaded', function () {
  window.laterData = preprocessData(window.DATA);
  console.log('I did it!');
});

/* Shim the assert function in there! */
!window.assert ? (window.assert = console.assert.bind(console)) : undefined;

// <data | preprocess data | drawGraph


/*=== Classes ===*/

/**
 * Class: ASTDiff
 *
 * Instantiated with an original data object.
 */
function ASTDiff(original) {
  /* Instantiate a new ASTDiff object if called without `new`. */
  if (!(this instanceof ASTDiff)) {
    return new ASTDiff(original);
  }

  var date = new Date(original.date);
  /* The date must be reasonable... */
  assert(date > new Date('1970-01-01') && date < new Date());
  assert(typeof original.type === 'string');
  assert(ASTDiff.EDIT_KIND.has(original.edit));
  assert(looksLikeAnEmail(original.author));

  this.date = date;
  this.type = original.type;
  this.author = original.author;
  this.edit = original.edit;
  this.commit = original.commitID;
}

/**
 * Valid edit kinds.
 */
ASTDiff.EDIT_KIND = d3.set(['ADD', 'REMOVE']);

/**
 * ASTDiff methods and computed properties.
 */
Object.defineProperties(ASTDiff.prototype, {
  isAdd: {
    get: function () {
      return this.edit === 'ADD';
    }
  },

  isRemove: {
    get: function () {
      return this.edit === 'REMOVE';
    }
  },
});


/**
 * Modifies original data.
 */
function preprocessData(data) {
  assert(data.types instanceof Array);
  assert(data.commits instanceof Array);
  assert(data.dates instanceof Array);

  return {
    /* A set of types. */
    types: d3.set(data.types),

    /* Mapping GitSha -> Commit MetaData. */
    commits: (function () {
      var commitMap = {};
      data.commits.forEach(function (commit) {
        assert(typeof commit.commitID  === 'string');
        var sha = commit.commitID;
        assert(looksLikeAGitSha(sha));

        commitMap[sha] = commit;
      });
      return commitMap;
    }()),

    /* A copy of AST Diff data, in asscending order of date. */
    astDiffs: (function (astDiffsByType) {
      return astDiffsByType
        .map(ASTDiff)
        .sort(function (a, b) {
          assert(a instanceof ASTDiff);
          return d3.ascending(a.date, b.date);
        });
    }(data.dates.slice()))
  };
}


/*=== Predicates used in assertions and checks ===*/

function looksLikeAnEmail(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  /* Emails are actually really complicated, but let's... do this: */
  return thing.match(/^.+@.+$/);
}


function looksLikeAGitSha(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  /* Emails are actually really complicated, but let's... do this: */
  return thing.match(/^[0-9a-f]+$/i);
}


/*=== The old implementation ===*/

function old() {
  /*
   * Derived from:
   * https://bost.ocks.org/mike/misrables/
   */
  var margin = {top: 80, right: 0, bottom: 10, left: 80},
      width = 720,
      height = 720;

  var x = d3.scale.ordinal().rangeBands([0, width]),
      y = d3.scale.ordinal().rangeBands([0, height]);

  var svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("margin-left", -margin.left + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  function Bin(start, end) {
    console.assert(start < end);
    this.start = start;
    this.end = end;

    this.types = [];
  }

  Bin.prototype.check = function (dateObj) {
    var date = new Date(dateObj.date)
    return this.start <= date && date < this.end;
  };

  Bin.prototype.add = function (dateObj) {
    console.assert(this.check(dateObj));
    this.types.push(dateObj);
  };


  function makeBins(start, end, step) {
    /* "Round down" to a decent value. */
    var currentStart = start;
    var currentEnd;
    var bins = [];

    while ((currentEnd === undefined) ||  currentEnd < end) {
      currentEnd = moment(new Date(currentStart));

      switch (step) {
          case 'hour':
              currentEnd.add(1, 'hour');
              break;
          case 'day':
              currentEnd.add(1, 'day');
              break;
          case 'week':
              /* Make smarter? */
              currentEnd.add(1, 'weeks');
              break;
          case 'month':
              currentEnd.add(1, 'month');
      }

      bins.push(new Bin(currentStart, currentEnd.toDate()));
      currentStart = currentEnd.toDate();
    }

    return bins;
  }


  function renderGraph(table, options) {
    var rows = table.types.length;

    /* TODO: Make bins somehow. */
    /*
     * TODO:
     *  - Calculate how many bins based on date range, step size.
     *  - Create empty bins
     *  - Add types to bins (based on dates)
     */
    var bins = makeBins(options.from, options.to, options.stepSize);
    var columns = bins.length;

    table.dates.forEach(function (item) {
      bins.forEach(function (bin) {
        if (bin.check(item)) {
          bin.add(item);
          return true;
        }
      });
    });

    /* Create a count of all the types actually binnned, plus their absolute frequency.  */
    var typesFrequency = {};
    bins.forEach(function (bin) {
      bin.types.forEach(function (item) {
        var freq = typesFrequency[item.type] || 0;
        typesFrequency[item.type] = freq + 1;
      });
    });

    var tuples = Object.keys(typesFrequency).map(function (typeName) {
      return { name: typeName, frequency: typesFrequency[typeName] };
    });

    /* Sort types on FREQUENCY USED, (such that it can be used while filtering).  */
    tuples.sort(function (a, b) {
      return a.frequency < b.frequency ? 1 : (a.frequency > b.frequency ? -1 : 0);
    });

    if (options.filter !== Infinity) {
      tuples = tuples.slice(options.filter);

      /* Set of types used. */
      var typesUsed = {};
      tuples.forEach(function (item) {
        typesUsed[item.name] = 1;
      });

      rows = tuples.length;
      /* Remove types from bins based off filtering. */
      bins.forEach(function (bin) {
        bin.types = bin.types.filter(function (item) {
          return !(item.type in typesUsed);
        });
      });
    }

    x.domain(d3.range(columns));
    y.domain(d3.range(rows));

    /* Outer rectangle. */
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);

    var row = svg.selectAll(".row")
        .data(tuples)
      .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(_d, i) { return "translate(0," + y(i) + ")"; })
        .each(row_fn);

    row.append("line")
        .attr("x2", width);

    row.append("text")
        .attr("x", -6)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text(function(d, i) { return d.name; });

    var column = svg.selectAll(".column")
        .data(bins)
      .enter().append("g")
        .attr("class", "column");

    column.append("line")
        .attr("x1", -width);

    column.append("text")
        .attr("x", 6)
        .attr("y", x.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .attr("transform", function(_d, i) { return "translate(" + x(i) + ")rotate(90)"; })
        .text(function(bin, i) { return bin.start; });

    function row_fn(row) {
      var cell = d3.select(this).selectAll(".cell")
          .data(bins)
        .enter().append("rect")
          .attr("class", "cell")
          .attr("x", function(d) { return x(d.x); })
          .attr("width", x.rangeBand())
          .attr("height", y.rangeBand())
          .style("fill", function(d) { return '#ff00ff'; })
    }
  }

  /* Just render the data! */
  renderGraph(window.DATA, {
    from: new Date('2016-03-20 19:59:54 -0600'),
    to: new Date('2016-03-21 21:58:54 -0600'),
    stepSize: 'day',
    filter: Infinity
  });
}

/*globals d3*/
/*eslint no-use-before-define: true */
