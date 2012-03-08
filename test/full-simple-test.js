var vows = require("vows"),
    assert = require("assert"),
    fs = require("fs"),
    Ginger = require("../lib/ginger");

var compiler = new Ginger.Compiler(),
    root = new Ginger.Context();

root.on_not_found = function(name, cb) {
  fs.readFile(__dirname + "/data/simple/input/" + name + ".ginger", function(err, data) {
    if (err) {
      return cb(err);
    }

    var parsed = Ginger.Parser.parse(data.toString());
    var compiled = compiler.compile(parsed);

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

var batch = {};
fs.readdirSync(__dirname + "/data/simple/input").map(function(f) { return f.replace(/.ginger$/, ""); }).forEach(function(file) {
  var k = file + ".ginger, when rendered";

  batch[k] = {
    topic: function(template) {
      var self = this;

      fs.readFile(__dirname + "/data/simple/output/" + file, function(err, correct) {
        if (err) {
          return self.callback(err);
        }

        correct = correct.toString();

        ctx.render(file, function(err, tocheck) {
          if (err) {
            return self.callback(err);
          }

          return self.callback(null, correct, tocheck);
        });
      });
    }
  };

  batch[k]["should not return an error"] = function(err, correct, tocheck) {
    assert.isNull(err);
  };

  batch[k]["should return a string"] = function(err, correct, tocheck) {
    assert.isString(tocheck);
  };

  batch[k]["should match the content of " + file] = function(err, correct, tocheck) {
    assert.equal(tocheck, correct);
  };
});

vows.describe("Top to bottom (simple)").addBatch(batch).export(module);
