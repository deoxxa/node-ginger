#!/usr/bin/env node

var fs = require("fs"),
    Ginger = require("./lib/ginger");

var compiler = new Ginger.Compiler(),
    root = new Ginger.Context();

root.on_not_found = function(name, cb) {
  fs.readFile(__dirname + "/res/templates/" + name + ".ginger", function(err, data) {
    if (err) {
      return cb(err);
    }

    var parsed = Ginger.Parser.parse(data.toString());
    var compiled = compiler.compile(parsed, {strip_newlines: true});

    cb(null, new Function("ctx", "cb", compiled));
  });
};

var ctx = root.create_child({
  people: [
    {name: "jack", gender: "male", age: 15, hobbies: ["fetching water", "going up hills", "falling down"]},
    {name: "jill", gender: "female", age: 14, hobbies: ["following jack"]},
    {name: "bowie", gender: "unknown", age: 999},
    {name: "-"},
  ],
});
ctx.add_function("default", function(input, args) { return input || args[0]; });
ctx.add_function("ucwords", function(input, args) { return input.replace(/(^|\s)([a-z])/g, function(m, p1, p2) { return p1 + p2.toUpperCase(); }); });

ctx.render("pages/index", function(err, data) {
  if (err) {
    console.log(err);
    return;
  }

  console.log(data);
});
