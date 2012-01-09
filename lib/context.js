module.exports = Context;

function Context(vars, parent) {
  this.vars = vars;
  this.functions = {};
  this.templates = {};
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
  if (typeof this.functions[name] !== "undefined") {
    return this.functions[name](input, args);
  } else if (this.parent) {
    return this.parent.call_function(name, input, args);
  } else {
    return null;
  }
};

Context.prototype.add_template = function(name, fun) {
  this.templates[name] = fun;

  return this;
};

Context.prototype.get_template = function(name) {
  if (typeof this.templates[name] !== "undefined") {
    return this.templates[name];
  } else if (this.parent) {
    return this.parent.get_template(name);
  } else {
    return null;
  }
};

Context.prototype.render = function(name) {
  return this.get_template(name)(this);
};

Context.prototype.get_value = function(path) {
  var res = this.vars;

  for (var i in path) {
    var segment = path[i];

    if (typeof res === "object" && typeof res[segment] !== "undefined") {
      res = res[segment];
    } else if (this.parent) {
      return this.parent.get_value(path);
    } else {
      return null;
    }
  }

  return res;
};
