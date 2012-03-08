var vows = require("vows"),
    assert = require("assert"),
    fs = require("fs"),
    Ginger = require("../lib/ginger");

vows.describe("Parser")
  .addBatch({
    "An empty template": {
      topic: "",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "A simple template": {
      topic: "I'm a {{ derp }} template!",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "A more complex template": {
      topic: "I'm a {{ derp }} template! Here are my hobbies:\n\n{% for hobby in hobbies %}{{ hobby }}\n{% endfor %}\n\nif (x) { y(); }",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "A broken template": {
      topic: "YOU SHALL NOT PARSE {{",
      "should throw": function(template) { assert.throws(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{{ some_variable }}": {
      topic: "{{ some_variable }}",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{% for x in y %}{% endfor %}": {
      topic: "{% for x in y %}{% endfor %}",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{% for x in y %}": {
      topic: "{% for x in y %}",
      "should throw": function(template) { assert.throws(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{% for a, b in c %}{% endfor %}": {
      topic: "{% for a, b in c %}{% endfor %}",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{% for a, b in c %}": {
      topic: "{% for a, b in c %}",
      "should throw": function(template) { assert.throws(function() { Ginger.Parser.parse(template); }, Error); },
    },
    "{% for x in y %}{{ x }}{% endfor %}": {
      topic: "{% for x in y %}{{ x }}{% endfor %}",
      "should not throw": function(template) { assert.doesNotThrow(function() { Ginger.Parser.parse(template); }, Error); },
    },
  })
.export(module);
