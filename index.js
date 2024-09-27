var balloon = require("./lib/balloon");
var cows = require("./lib/cows");
var faces = require("./lib/faces");
const { Transform } = require("stream");
const stringWidth = require("string-width");

function split(text, wrap) {
  text = text.replace(/\r\n?/g, "\n");

  let lines = [];
  if (!wrap) {
    lines = text.split("\n");
  } else {
    const words = text.split(/\s+/);
    let line = "";

    words.forEach((word) => {
      if (stringWidth(line + word) > wrap) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    });

    if (line) lines.push(line);
  }

  return lines;
}

function formatLines(
  lines,
  delimiters,
  maxWidth,
  isFirstChunk,
  isLastChunk = false,
) {
  let output = "";

  if (isFirstChunk) {
    output += " " + top(maxWidth) + "\n";
  }

  lines.forEach((line, index) => {
    let delimiter;

    if (lines.length === 1 && isFirstChunk && isLastChunk) {
      delimiter = delimiters.only;
    } else if (index === 0 && isFirstChunk) {
      delimiter = delimiters.first;
    } else if (index === lines.length - 1 && isLastChunk) {
      delimiter = delimiters.last;
    } else {
      delimiter = delimiters.middle;
    }

    output +=
      delimiter[0] + " " + pad(line, maxWidth) + " " + delimiter[1] + "\n";
  });

  if (isLastChunk) {
    output += " " + bottom(maxWidth) + "\n";
  }

  return output;
}

function pad(text, length) {
  const padding = " ".repeat(length - stringWidth(text));
  return text + padding;
}

function top(length) {
  return "_".repeat(length + 2);
}

function bottom(length) {
  return "-".repeat(length + 2);
}

/**
 * Streaming version of the say function.
 * @param {Object} options - The options for the cow and face.
 * @returns {Transform} A Transform stream that processes input text.
 */
exports.sayStream = function (options) {
  return doStream(options, true);
};

/**
 * Streaming version of the think function.
 * @param {Object} options - The options for the cow and face.
 * @returns {Transform} A Transform stream that processes input text.
 */
exports.thinkStream = function (options) {
  return doStream(options, false);
};

/**
 * Regular say function.
 * @param {Object} options - The options for the cow and face.
 * @returns {string} Compiled cow string.
 */
exports.say = function (options) {
  return doIt(options, true);
};

/**
 * Regular think function.
 * @param {Object} options - The options for the cow and face.
 * @returns {string} Compiled cow string.
 */
exports.think = function (options) {
  return doIt(options, false);
};

/**
 * List available cows.
 */
exports.list = cows.list;

/**
 * Function to process options and generate the cow string.
 * @param {Object} options - The options for the cow and face.
 * @param {boolean} sayAloud - Whether the cow is saying or thinking.
 * @returns {string} Compiled cow string.
 */
function doIt(options, sayAloud) {
  var cowFile;

  if (options.r) {
    var cowsList = cows.listSync();
    cowFile = cowsList[Math.floor(Math.random() * cowsList.length)];
  } else {
    cowFile = options.f || "default";
  }

  var cow = cows.get(cowFile);
  var face = faces(options);
  face.thoughts = sayAloud ? "\\" : "o";

  var action = sayAloud ? "say" : "think";
  return (
    balloon[action](
      options.text || options._.join(" "),
      options.n ? null : options.W,
    ) +
    "\n" +
    cow(face)
  );
}

/**
 * Function to create a Transform stream for streaming input.
 * @param {Object} options - The options for the cow and face.
 * @param {boolean} sayAloud - Whether the cow is saying or thinking.
 * @returns {Transform} A Transform stream that processes input text.
 */
function doStream(options, sayAloud) {
  const cowFile = options.r
    ? cows.listSync()[Math.floor(Math.random() * cows.listSync().length)]
    : options.f || "default";

  const cow = cows.get(cowFile);
  const face = faces(options);
  face.thoughts = sayAloud ? "\\" : "o";

  const wrap = options.n ? null : options.W;
  const maxWidth = wrap || 40; // default wrap width

  // Define delimiters based on say or think
  const delimiters = {
    first: sayAloud ? ["/", "\\"] : ["(", ")"],
    middle: sayAloud ? ["|", "|"] : ["(", ")"],
    last: sayAloud ? ["\\", "/"] : ["(", ")"],
    only: sayAloud ? ["<", ">"] : ["(", ")"],
  };

  let buffer = "";
  let isFirstChunk = true;
  let lines = [];
  let topPrinted = false;
  let bottomPrinted = false;

  const stream = new Transform({
    readableObjectMode: false,
    writableObjectMode: false,
    transform(chunk, encoding, callback) {
      buffer += chunk.toString();

      // Process complete lines
      const splitLines = buffer.split("\n");
      buffer = splitLines.pop(); // Keep the incomplete line in buffer

      splitLines.forEach((line) => {
        lines.push(...split(line, wrap));
      });

      // Output lines incrementally if possible
      if (lines.length > 0) {
        const formatted = formatLines(
          lines,
          delimiters,
          maxWidth,
          isFirstChunk,
          false,
        );
        this.push(formatted);
        lines = [];
        isFirstChunk = false;
        topPrinted = true;
      }

      callback();
    },
    flush(callback) {
      if (buffer) {
        lines.push(...split(buffer, wrap));
        buffer = "";
      }

      if (lines.length > 0 || !bottomPrinted) {
        const formatted = formatLines(
          lines,
          delimiters,
          maxWidth,
          isFirstChunk,
          true,
        );
        this.push(formatted);
        lines = [];
        bottomPrinted = true;
      }

      // Append the cow
      const cowText = cow(face);
      this.push(cowText + "\n");

      callback();
    },
  });

  return stream;
}
