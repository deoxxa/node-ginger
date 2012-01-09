module.exports = Context;

function Context(vars, parent) {
  this.vars = vars;
  this.functions = {};
  this.parent = parent;
}

Context.prototype.create_child = function(vars) {
  return new Context(vars, this);
};

Context.prototype.add_function = function(name, fn) {
  this.functions[name] = fn;
  return this;
};

Context.prototype.remove_function = function(name) {
  this.functions[name] && delete this.functions[name];
  return this;
};

Context.prototype.call_function = function(name, input, args) {
  if (typeof this.functions[name] == "undefined") {
    if (this.parent) {
      return this.parent.call_function(name, input, args);
    } else {
      return null;
    }
  }

  return this.functions[name](input, args);
};

Context.prototype.get_value = function(path) {
  var res = this.vars;

  for (var i in path) {
    var segment = path[i];

    if (typeof res != "object" || typeof res[segment] == "undefined") {
      if (this.parent) {
        return this.parent.get_value(path);
      } else {
        return null;
      }
    }

    res = res[segment];
  }

  return res;
};
