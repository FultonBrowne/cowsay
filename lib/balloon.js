var stringWidth = require("string-width");
const { Transform } = require("stream");

exports.say = function (text, wrap) {
  var delimiters = {
    first: ["/", "\\"],
    middle: ["|", "|"],
    last: ["\\", "/"],
    only: ["<", ">"],
  };

  return format(text, wrap, delimiters);
};

exports.think = function (text, wrap) {
  var delimiters = {
    first: ["(", ")"],
    middle: ["(", ")"],
    last: ["(", ")"],
    only: ["(", ")"],
  };

  return format(text, wrap, delimiters);
};

exports.sayStream = function (wrap) {
  var delimiters = {
    first: ["/", "\\"],
    middle: ["|", "|"],
    last: ["\\", "/"],
    only: ["<", ">"],
  };

  return createStream(wrap, delimiters);
};

exports.thinkStream = function (wrap) {
  var delimiters = {
    first: ["(", ")"],
    middle: ["(", ")"],
    last: ["(", ")"],
    only: ["(", ")"],
  };

  return createStream(wrap, delimiters);
};

function createStream(wrap, delimiters) {
  return new Transform({
    readableObjectMode: false,
    writableObjectMode: false,
    transform(chunk, encoding, callback) {
      this._data = (this._data || "") + chunk.toString();
      callback();
    },
    flush(callback) {
      var result = format(this._data, wrap, delimiters);
      this.push(result);
      callback();
    },
  });
}

function format(text, wrap, delimiters) {
  var lines = split(text, wrap);
  var maxLength = max(lines);

  var balloon;
  if (lines.length === 1) {
    balloon = [
      " " + top(maxLength),
      delimiters.only[0] + " " + lines[0] + " " + delimiters.only[1],
      " " + bottom(maxLength),
    ];
  } else {
    balloon = [" " + top(maxLength)];

    for (var i = 0, len = lines.length; i < len; i += 1) {
      var delimiter;

      if (i === 0) {
        delimiter = delimiters.first;
      } else if (i === len - 1) {
        delimiter = delimiters.last;
      } else {
        delimiter = delimiters.middle;
      }

      balloon.push(
        delimiter[0] + " " + pad(lines[i], maxLength) + " " + delimiter[1],
      );
    }

    balloon.push(" " + bottom(maxLength));
  }

  return balloon.join("\n");
}

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

function max(lines) {
  var max = 0;
  for (var i = 0, len = lines.length; i < len; i += 1) {
    if (stringWidth(lines[i]) > max) {
      max = stringWidth(lines[i]);
    }
  }

  return max;
}

function pad(text, length) {
  return text + new Array(length - stringWidth(text) + 1).join(" ");
}

function top(length) {
  return new Array(length + 3).join("_");
}

function bottom(length) {
  return new Array(length + 3).join("-");
}
