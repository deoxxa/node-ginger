#!/usr/bin/env node

var fs = require("fs"),
    Ginger = require("./lib/ginger");

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

ctx.add_template("simple", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/simple.ginger").toString()))));
ctx.add_template("index", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/index.ginger").toString()))));
ctx.add_template("layout", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/layout.ginger").toString()))));
ctx.add_template("header", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/included.ginger").toString()))));
ctx.add_template("footer", new Function("ctx", compiler.compile(Ginger.Parser.parse(fs.readFileSync("res/included.ginger").toString()))));

console.log(ctx.render("index"));
