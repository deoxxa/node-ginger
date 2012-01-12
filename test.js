#!/usr/bin/env node

var fs = require("fs"),
    util = require("util"),
    uglify = require("uglify-js").uglify,
    Ginger = require("./lib/ginger");

var data = fs.readFileSync("res/test.twig").toString().replace(/\s+$/, "");

var compiler = new Ginger.Compiler();

var ctx = new Ginger.Context({
  people: [
    {name: "jack", gender: "male", age: 15, hobbies: ["fetching water", "going up hills", "falling down"]},
    {name: "jill", gender: "female", age: 14, hobbies: ["following jack"]},
    {name: "bowie", gender: "unknown", age: 999},
    {name: "-"},
  ],
});
ctx.add_function("default", function(input, args) { return input || args[0]; });
ctx.add_function("ucwords", function(input, args) { return input.replace(/(^|\s)([a-z])/g, function(m, p1, p2) { return p1 + p2.toUpperCase(); }); });

try {
  var parsed = Ginger.Parser.parse(data);
} catch (e) {
  console.log(e);
  process.exit();
}

//console.log(JSON.stringify(parsed, null, 2));
//console.log("");

//var ast = compiler.make_ast(parsed);
//console.log(JSON.stringify(ast, null, 2));
//console.log("");

var compiled = compiler.compile(parsed);
//console.log(compiled);
//console.log("");

//console.log(data);
//console.log("");

ctx.add_template("index", new Function("ctx", compiled));
ctx.add_template("layout", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/layout.twig").toString()))));
ctx.add_template("header", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/included.twig").toString()))));
ctx.add_template("footer", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/included.twig").toString()))));

console.log(ctx.get_template("index").toString());

console.log(ctx.render("index"));
