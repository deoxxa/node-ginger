var uglify = require("uglify-js").uglify,
    parser = require("./parser");

module.exports = Compiler;

function Compiler() {
}

Compiler.prototype.make_ast = function(input, config, state) {
  var self = this;

  if (typeof config === "undefined") { config = {}; }
  if (typeof state === "undefined") { state = {seq: 0, names: []}; }

  state.names.push("ctx_" + state.seq++);

  var extends_tags = this.join_arrays(input.filter(function(node) {
    return node.type === "extends";
  }).map(function(node) {
    return self.compile_node(node, config, state);
  }).filter(function(node) {
    return !!node;
  }));

  var allowed = null;
  if (extends_tags.length != 0) {
    allowed = ["block","for","if"];
  }

  var nodes = this.join_arrays(input.filter(function(node) {
    return allowed ? (allowed.indexOf(node.type) !== -1) : true;
  }).map(function(node) {
    return self.compile_node(node, config, state);
  }).filter(function(node) {
    return !!node;
  }));

  var res = this.join_arrays([
    [
      ["var", [
        [state.names[state.names.length-1], ["call", ["dot", ["name", "ctx"], "create_child"], []]],
        ["q", ["call", ["dot", ["name", state.names[state.names.length-1]], "create_queue"], [["name", "cb"]]]],
      ]],
    ],
    nodes,
    extends_tags,
    [
      ["call", ["dot", ["name", "q"], "run"], []],
    ],
  ]);

  state.names.pop();

  return res;
};

Compiler.prototype.compile = function(input, config, state) {
  return uglify.gen_code(["toplevel", this.make_ast(input, config, state)], {beautify: true, indent_start: 2, indent_level: 2});
};

Compiler.prototype.join_arrays = function(arrays) {
  return Array.prototype.concat.apply([], arrays);
};

Compiler.prototype.compile_node = function(node, config, state) {
  switch (node.type) {
    // Output tags
    case "raw": return this.compile_raw(node, config, state);
    case "print": return this.compile_print(node, config, state);
    case "include": return this.compile_include(node, config, state);
    // Logic tags
    case "if": return this.compile_if(node, config, state);
    case "for": return this.compile_for(node, config, state);
    case "extends": return this.compile_extends(node, config, state);
    case "block": return this.compile_block(node, config, state);
  }

  return;
};

Compiler.prototype.compile_nodes = function(nodes, config, state) {
  var self = this;
  return this.join_arrays(nodes.map(function(node) { return self.compile_node(node, config, state); }));
};

Compiler.prototype.compile_raw = function(node, config, state) {
  if (config.strip_newlines) {
    node.data = node.data.replace(/^\r?\n/, "");
  }

  return [[
    "call",
    ["dot", ["name", "q"], "push"],
    [
      ["string", node.data],
    ],
  ]];
};

Compiler.prototype.compile_print = function(node, config, state) {
  return [[
    "call",
    ["dot", ["name", "q"], "push"],
    [
      this.compile_expression(node.expression, config, state),
    ],
  ]];
};

Compiler.prototype.compile_if = function(node, config, state) {
  var tree = [
    "if", this.compile_condition(node.condition, config, state),
    ["block", this.compile_nodes(node.action, config, state)],
  ];

  var top = tree;
  if (node.elsifs) {
    for (i in node.elsifs) {
      var l = node.elsifs[i];
      top.push([
        "if", this.compile_condition(l.condition, config, state),
        ["block", this.compile_nodes(l.action, config, state)],
      ]);
      top = top[top.length - 1];
    }
  }

  if (node.else) {
    top.push(["block", this.compile_nodes(node.else, config, state)]);
  }

  return [tree];
};

Compiler.prototype.compile_for = function(node, config, state) {
  var tmp_key_name = "_tmp_key_" + state.seq++,
      tmp_obj_name = "_tmp_obj_" + state.seq++;

  var ast = [];

  ast.push(["var", [
    [tmp_key_name, ["string", ""]],
    [tmp_obj_name, this.compile_expression(node.config.source, config, state)],
  ]]);

  state.names.push("ctx_" + state.seq++);

  ast.push([
    "for-in",
    ["name", [tmp_key_name]],
    ["name", [tmp_key_name]],
    ["name", [tmp_obj_name]],
    ["block", [
      ["stat", ["call", ["function", null, [], [].concat(
        [
          ["var", [
            [state.names[state.names.length-1], ["call",
              ["dot", ["name", state.names[state.names.length-2]], "create_child"],
              [
                ["object", [
                  [node.config.value.name, ["sub", ["name", tmp_obj_name], ["name", tmp_key_name]]],
                  [node.config.key ? node.config.key.name : "key", ["name", tmp_key_name]],
                ]],
              ],
            ]],
          ]],
        ],
        this.compile_nodes(node.action, config, state)
      )]]],
    ]],
  ]);

  state.names.pop();

  return ast;
};

Compiler.prototype.compile_include = function(node, config, state) {
  var self = this;

  return [
    ["call", ["dot", ["name", "q"], "push"],
    [
      ["function", null, ["cb"],
      [
        ["call", ["dot", ["name", state.names[state.names.length-1]], "render"],
        [
          this.compile_expression(node.expression, config, state),
          ["name", "cb"],
        ]],
      ]],
    ]],
  ];
};

Compiler.prototype.compile_extends = function(node, config, state) {
  var self = this;

  config.extending = true;

  return [
    ["call", ["dot", ["name", "q"], "push"],
    [
      ["function", null, ["cb"],
      [
        ["call", ["dot", ["name", state.names[state.names.length-1]], "render"],
        [
          this.compile_expression(node.expression, config, state),
          ["name", "cb"],
        ]],
      ]],
    ]],
  ];
};

Compiler.prototype.compile_block = function(node, config, state) {
  var self = this;

  var ast = [];

  ast.push(["call", ["dot", ["name", state.names[state.names.length-1]], "add_block"], [
    this.compile_expression(node.expression, config, state),
    ["function", null, ["ctx", "cb"], this.make_ast(node.content, config, state)],
  ]]);

  if (!config.extending) {
    ast.push(["call", ["dot", ["name", "q"], "push"], [
      ["function", null, ["cb"], [
        ["call", ["dot", ["name", state.names[state.names.length-1]], "call_block"], [
          this.compile_expression(node.expression, config, state),
          ["name", "cb"],
        ]],
      ]],
    ]]);
  }

  return ast;
};

Compiler.prototype.compile_condition = function(input, config, state) {
  if (input.comparison) {
    return [
      "binary", input.comparison.type,
      this.compile_expression(input.source, config, state),
      this.compile_expression(input.comparison.expression, config, state),
    ];
  } else {
    return this.compile_expression(input.source, config, state);
  }
};

Compiler.prototype.compile_expression = function(input, config, state) {
  var self = this;

  var result;
  switch (input.source.type) {
    case "path":     { result = this.compile_path(input.source, config, state);     break; }
    case "string":   { result = this.compile_string(input.source, config, state);   break; }
    case "number":   { result = this.compile_number(input.source, config, state);   break; }
    case "function": { result = this.compile_function(input.source, null, config, state); break; }
  }

  input.filters.forEach(function(f) {
    result = self.compile_function(f, result, config, state);
  });

  return result;
};

Compiler.prototype.compile_string = function(input, config, state) {
  return ["string", input.data];
};

Compiler.prototype.compile_number = function(input, config, state) {
  return ["num", input.data];
};

Compiler.prototype.compile_path = function(input, config, state) {
  return [
    "call",
    ["dot", ["name", state.names[state.names.length-1]], "get_value"],
    [
      ["array", input.parts.map(function(p) { return ["string", p]; })],
    ],
  ];
};

Compiler.prototype.compile_function = function(input, argument, config, state) {
  var self = this;

  return [
    "call",
    ["dot", ["name", state.names[state.names.length-1]], "call_function"],
    [
      ["string", input.name.name],
      argument || ["name", "null"],
      ["array", input.arguments.map(function(a) { return self.compile_expression(a, config, state); })],
    ],
  ];
};
