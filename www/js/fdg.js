/**
 * Temporary file for force-directed graphs.
 */
import preprocessData from "./preprocess-data.js";
import DataView from "./data-filter.js";

const TYPE = 0;
const AUTHOR = 1;

export default function doIt() {
  /** TODO: pre-preprocess data? */
  var data = DataView.filter(preprocessData(window.DATA), {
    limit: 40
  });

  var graph = graphFromData(data);

  var width = 960, height = 500;

  var color = d3.scale.category10();

  var force = d3.layout.force()
      .charge(-120)
      .linkDistance(100)
      .size([width, height]);

  // Insert stuff into #figure
  var svg = d3.select("#figure").append("svg")
      .attr("width", width)
      .attr("height", height);

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    .enter().append("circle")
      .attr("class", "node")
      // Make authors bigger.
      .attr("r", node => node.kind == AUTHOR ? 10 : 5)
      .style("fill", node => color(node.kind))
      .call(force.drag);

  // This is not... this is... no.
  node.append("title")
      .text(node => node.label);

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });

  document.querySelector('#loading-indicator').remove();
}

/**
 * returns {
 *      nodes: [ordered list of authors or types]
 *      links: [list of links between authors and types]
 *  }
 */
function graphFromData(data) {
  var nodes = [];

  for (let author of data.authors) {
    nodes.push({label: author, data: author, kind: AUTHOR});
  }

  for (let type of data.types) {
    nodes.push({label: type.name, data: type, kind: TYPE});
  }

  var authorRelations = new Map();

  /* Prepare links. */
  var links = [];

  for (let diff of data.astDiffs) {
    const author = diff.author;
    /* XXX: This is not a JavaType, unfortunately. Just a string... */
    const typeName = diff.type;

    if (!authorRelations.has(author)) {
      authorRelations.set(author, new Map());
    }

    const quantity = 1 + (authorRelations.get(author).get(typeName) || 0);
    authorRelations.get(author).set(typeName, quantity);
  }

  for (let [author, types] of authorRelations) {
    for (let [typeName, value] of types) {
      const source = authorIndex(author);
      const target = typeIndex(typeName);

      if (target !== null) {
        links.push({ source, target, value });
      }
    }
  }

  return { nodes, links };

  /**
   * Finds the index in the nodes array of the given item.
   */
  function authorIndex(item) {
    const length = data.authors.length;
    for (let i = 0; i < length; i++) {
      let other = nodes[i].data;
      if (other === item) {
        return i;
      }
    }
    throw new Error('Could not find index for author');
  }

  function typeIndex(typeName) {
    const length = nodes.length;
    for (let i = data.authors.length; i < length; i++) {
      let other = nodes[i].data.name;
      if (typeName === other) {
        return i;
      }
    }
    return null;
  }
}

/*global d3*/
