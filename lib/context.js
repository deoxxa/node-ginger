module.exports = Context;

function Context(vars, parent) {
  this.vars = vars || {};
  this.functions = {};
  this.templates = {};
  this.blocks = {};
  this.parent = parent;
  this.children = [];
}

Context.prototype.create_child = function(vars) {
  var tmp = new Context(vars, this);
  this.children.push(tmp);
  return tmp;
};

/*
 * These are currently unused - they may be useful in future
 *
Context.prototype.current_child = function() {
  return this.children.length ? this.children[this.children.length-1] : null;
};

Context.prototype.deepest_child = function() {
  if (!this.children.length) {
    return this;
  }

  return this.current_child().deepest_child();
};
*/

Context.prototype.chain = function() {
  return this.parent ? this.parent.chain().concat([this]) : [this];
};

Context.prototype.leave_parent = function() {
  this.parent.children.pop();
  return this.parent;
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

Context.prototype.add_block = function(name, fun) {
  this.blocks[name] = fun;

  return this;
};

Context.prototype.get_block = function(name) {
  if (typeof this.blocks[name] !== "undefined") {
    return this.blocks[name];
  } else if (this.parent) {
    return this.parent.get_block(name);
  } else {
    return null;
  }
};

Context.prototype.call_block = function(name) {
  var block = null, chain = this.chain();

  chain.forEach(function(link) {
    if (!block) { block = link.get_block(name); }
  });

  if (block) {
    return block(this);
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
