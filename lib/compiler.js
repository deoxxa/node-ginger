var uglify = require("uglify-js").uglify,
    parser = require("./parser");

module.exports = Compiler;

function Compiler() {
}

Compiler.prototype.make_ast = function(input, config) {
  var self = this;

  if (!config) { config = {seq: 0, names: []}; }

  config.names.push("ctx_" + config.seq++);

  var extends_tags = this.join_arrays(input.filter(function(node) {
    return node.type === "extends";
  }).map(function(node) {
    return self.compile_node(node, config);
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
    return self.compile_node(node, config);
  }).filter(function(node) {
    return !!node;
  }));

  var res = this.join_arrays([
    [
      ["var", [
        [config.names[config.names.length-1], ["call", ["dot", ["name", "ctx"], "create_child"], []]],
        ["q", ["call", ["dot", ["name", config.names[config.names.length-1]], "create_queue"], [["name", "cb"]]]],
      ]],
    ],
    nodes,
    extends_tags,
    [
      ["call", ["dot", ["name", "q"], "run"], []],
    ],
  ]);

  config.names.pop();

  return res;
};

Compiler.prototype.compile = function(input, config) {
  return uglify.gen_code(["toplevel", this.make_ast(input, config)], {beautify: true, indent_start: 2, indent_level: 2});
};

Compiler.prototype.join_arrays = function(arrays) {
  return Array.prototype.concat.apply([], arrays);
};

Compiler.prototype.compile_node = function(node, config) {
  switch (node.type) {
    // Output tags
    case "raw": return this.compile_raw(node, config);
    case "print": return this.compile_print(node, config);
    case "include": return this.compile_include(node, config);
    // Logic tags
    case "if": return this.compile_if(node, config);
    case "for": return this.compile_for(node, config);
    case "extends": return this.compile_extends(node, config);
    case "block": return this.compile_block(node, config);
  }

  return;
};

Compiler.prototype.compile_nodes = function(nodes, config) {
  var self = this;
  return this.join_arrays(nodes.map(function(node) { return self.compile_node(node, config); }));
};

Compiler.prototype.compile_raw = function(node, config) {
  return [[
    "call",
    ["dot", ["name", "q"], "push"],
    [
      ["string", node.data],
    ],
  ]];
};

Compiler.prototype.compile_print = function(node, config) {
  return [[
    "call",
    ["dot", ["name", "q"], "push"],
    [
      this.compile_expression(node.expression, config),
    ],
  ]];
};

Compiler.prototype.compile_if = function(node, config) {
  var tree = [
    "if", this.compile_condition(node.condition, config),
    ["block", this.compile_nodes(node.action, config)],
  ];

  var top = tree;
  if (node.elsifs) {
    for (i in node.elsifs) {
      var l = node.elsifs[i];
      top.push([
        "if", this.compile_condition(l.condition, config),
        ["block", this.compile_nodes(l.action, config)],
      ]);
      top = top[top.length - 1];
    }
  }

  if (node.else) {
    top.push(["block", this.compile_nodes(node.else, config)]);
  }

  return [tree];
};

Compiler.prototype.compile_for = function(node, config) {
  var tmp_key_name = "_tmp_key_" + config.seq++,
      tmp_obj_name = "_tmp_obj_" + config.seq++;

  var ast = [];

  ast.push(["var", [
    [tmp_key_name, ["string", ""]],
    [tmp_obj_name, this.compile_expression(node.config.source, config)],
  ]]);

  config.names.push("ctx_" + config.seq++);

  ast.push([
    "for-in",
    ["name", [tmp_key_name]],
    ["name", [tmp_key_name]],
    ["name", [tmp_obj_name]],
    ["block", [
      ["stat", ["call", ["function", null, [], [].concat(
        [
          ["var", [
            [config.names[config.names.length-1], ["call",
              ["dot", ["name", config.names[config.names.length-2]], "create_child"],
              [
                ["object", [
                  [node.config.value.name, ["sub", ["name", tmp_obj_name], ["name", tmp_key_name]]],
                  [node.config.key ? node.config.key.name : "key", ["name", tmp_key_name]],
                ]],
              ],
            ]],
          ]],
        ],
        this.compile_nodes(node.action, config)
      )]]],
    ]],
  ]);

  config.names.pop();

  return ast;
};

Compiler.prototype.compile_include = function(node, config) {
  var self = this;

  return [
    ["call", ["dot", ["name", "q"], "push"],
    [
      ["function", null, ["cb"],
      [
        ["call", ["dot", ["name", config.names[config.names.length-1]], "render"],
        [
          this.compile_expression(node.expression, config),
          ["name", "cb"],
        ]],
      ]],
    ]],
  ];
};

Compiler.prototype.compile_extends = function(node, config) {
  var self = this;

  config.extending = true;

  return [
    ["call", ["dot", ["name", "q"], "push"],
    [
      ["function", null, ["cb"],
      [
        ["call", ["dot", ["name", config.names[config.names.length-1]], "render"],
        [
          this.compile_expression(node.expression, config),
          ["name", "cb"],
        ]],
      ]],
    ]],
  ];
};

Compiler.prototype.compile_block = function(node, config) {
  var self = this;

  var ast = [];

  ast.push(["call", ["dot", ["name", config.names[config.names.length-1]], "add_block"], [
    this.compile_expression(node.expression, config),
    ["function", null, ["ctx", "cb"], this.make_ast(node.content, config)],
  ]]);

  if (!config.extending) {
    ast.push(["call", ["dot", ["name", "q"], "push"], [
      ["function", null, ["cb"], [
        ["call", ["dot", ["name", config.names[config.names.length-1]], "call_block"], [
          this.compile_expression(node.expression, config),
          ["name", "cb"],
        ]],
      ]],
    ]]);
  }

  return ast;
};

Compiler.prototype.compile_condition = function(input, config) {
  if (input.comparison) {
    return [
      "binary", input.comparison.type,
      this.compile_expression(input.source, config),
      this.compile_expression(input.comparison.expression, config),
    ];
  } else {
    return this.compile_expression(input.source, config);
  }
};

Compiler.prototype.compile_expression = function(input, config) {
  var self = this;

  var result;
  switch (input.source.type) {
    case "path":     { result = this.compile_path(input.source, config);     break; }
    case "string":   { result = this.compile_string(input.source, config);   break; }
    case "number":   { result = this.compile_number(input.source, config);   break; }
    case "function": { result = this.compile_function(input.source, null, config); break; }
  }

  input.filters.forEach(function(f) {
    result = self.compile_function(f, result, config);
  });

  return result;
};

Compiler.prototype.compile_string = function(input, config) {
  return ["string", input.data];
};

Compiler.prototype.compile_number = function(input, config) {
  return ["num", input.data];
};

Compiler.prototype.compile_path = function(input, config) {
  return [
    "call",
    ["dot", ["name", config.names[config.names.length-1]], "get_value"],
    [
      ["array", input.parts.map(function(p) { return ["string", p]; })],
    ],
  ];
};

Compiler.prototype.compile_function = function(input, argument, config) {
  var self = this;

  return [
    "call",
    ["dot", ["name", config.names[config.names.length-1]], "call_function"],
    [
      ["string", input.name.name],
      argument || ["name", "null"],
      ["array", input.arguments.map(function(a) { return self.compile_expression(a, config); })],
    ],
  ];
};
