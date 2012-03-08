function Q(done) {
  this.jobs = [];
  this.chunks = [];
  this.done = done;
}

Q.prototype.push = function(e) {
  this.jobs.push(e);
}

Q.prototype.run = function() {
  var self = this;

  while (this.jobs.length) {
    var job = this.jobs.shift();

    if (typeof job === "number" || typeof job === "string") {
      this.chunks.push(job);
    } else if (typeof job == "function") {
      job(function(err, data) {
        self.jobs.unshift(data);
        self.run();
      });

      return;
    }
  }

  if (this.jobs.length == 0) {
    return this.done(null, this.chunks.join(""));
  }
};

module.exports = Context;

function Context(vars, parent) {
  this.vars = vars || {};
  this.functions = {};
  this.templates = {};
  this.blocks = {};
  this.parent = parent;
}

Context.prototype.create_queue = function(done) {
  return new Q(done);
};

Context.prototype.create_child = function(vars) {
  var tmp = new Context(vars, this);
  return tmp;
};

Context.prototype.chain = function() {
  return this.parent ? this.parent.chain().concat([this]) : [this];
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

Context.prototype.get_template = function(name, cb) {
  if (typeof this.templates[name] !== "undefined") {
    return cb(null, this.templates[name]);
  } else if (typeof this.on_not_found == "function") {
    return this.on_not_found(name, cb);
  } else if (this.parent) {
    return this.parent.get_template(name, cb);
  } else {
    return cb(Error("Couldn't load template"));
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

Context.prototype.call_block = function(name, cb) {
  var block = null, current = this, chain = [];
  while (current.parent) {
    chain.unshift(current);
    current = current.parent;
  }
  while (block === null && chain.length) {
    block = chain[0].get_block(name);
    chain.shift();
  }

  if (block) {
    return block(this, cb);
  } else {
    return cb(Error("Couldn't find block: " + name));
  }
};

Context.prototype.render = function(name, cb) {
  var self = this;

  this.get_template(name, function(err, fn) {
    if (err) {
      return cb(err);
    }

    fn(self, cb);
  });
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
