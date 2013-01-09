"use strict";
var esprima = require("esprima"),
	transform = require("./tree-transform").transform;

var messages = {
	"whitespace": "Incorrect whitespace",
	"syntax": "Looks like a syntax error. Should never happen!",
	badIndentation: "Lines should be properly indented with tabs",
	stringsDoublequotes: "Strings should use doublequotes",
	operatorSingleSpaceBeforeAfter: "Binary operators should be surrounded by spaces",
	symbolUnaryNoSpaces:
		"Single character unary operators (!, +, -, ~) must not have a space before the argument",
	wordUnaryOneSpace:
		"Word unary operators (delete, void, typeof) must have a space before the argument",
	braceOwnLine: "Opening braces should on their own line",
	identifierCamelCase: "Identifiers should be in camelCase",
	emptyStatement: "Empty statement",
	debuggerStatement: "Debugger statement",
	singleSpace: "Use single spaces to seperate code within a line"
};
exports.messages = messages;

var children = {
	ArrayExpression: ["elements"],
	AssignmentExpression: ["left", "right"],
	BinaryExpression: ["left", "right"],
	BlockStatement: ["body"],
	BreakStatement: ["label"],
	CallExpression: ["arguments", "callee"],
	CatchClause: ["param", "body"],
	ConditionalExpression: ["test", "consequent", "alternate"],
	ContinueStatement: ["label"],
	DebuggerStatement: [],
	DoWhileStatement: ["body", "test"],
	EmptyStatement: [],
	ExpressionStatement: ["expression"],
	ForInStatement: ["left", "right", "body"],
	ForStatement: ["init", "test", "update", "body"],
	FunctionDeclaration: ["id", "params", "body"],
	FunctionExpression: ["id", "params", "body"],
	Identifier: [],
	IfStatement: ["test", "consequent", "alternate"],
	LabeledStatement: ["label", "body"],
	List: ["items"],
	Literal: [],
	LogicalExpression: ["left", "right"],
	MemberExpression: ["object", "property"],
	NewExpression: ["arguments", "callee"],
	ObjectExpression: ["properties"],
	Program: ["body"],
	Property: ["key", "value"],
	ReturnStatement: ["argument"],
	SequenceExpression: ["expressions"],
	SwitchCase: ["test", "consequent"],
	SwitchStatement: ["cases", "discriminant"],
	ThisExpression: [],
	ThrowStatement: ["argument"],
	TryStatement: ["handlers", "block", "finalizer"],
	UnaryExpression: ["argument"],
	UpdateExpression: ["argument"],
	VariableDeclaration: ["declarations"],
	VariableDeclarator: ["id", "init"],
	WhileStatement: ["test", "body"],
	WithStatement: ["object", "body"]
};

var indentChildren = {
	BlockStatement: "body",
	ObjectExpression: "properties"
};

exports.parse = function(source, options)
{
	var nodeCheckers,
		rules = {
			"identifierCamelCase": true,
		},
		parseTree = esprima.parse(source, {
			comment: true,
			range: true,
			loc: true,
			tolerant: true,
			tokens: true
		}),
		errors = [];

	parseTree = transform(parseTree, source);

	// TODO: now patch the parse tree to include comments, newlines, whitespace, etc.
	// Maybe?

	for(var name in options)
	{
		rules[name] = options[name];
	}

	var getError = function(type, node, expected, found, offset)
	{
		if(!messages[type])
		{
			throw new Error("Error type '" + type + "' is not known");
		}

		if(expected === undefined || found === undefined)
		{
			throw new Error("No expected/found given for type '" + type + "'");
		}

		return {
			type: messages[type],
			expected: expected,
			found: found,
			line: node.loc.start.line,
			column: node.loc.start.column,
			offset: offset
		};
	};

	var checkNode = function(node, depth)
	{
		if(!(node instanceof Object) || !node.type)
		{
			return;
		}

		//	if(source[node.range[0] - 1] === "(" && source[node.range[1]] === ")")
		//	{
		//		console.log(
		//			source.slice(node.range[0] - 1, node.range[1] + 1),
		//			source[node.range[0] - 1],
		//			source[node.range[1]]
		//		);
		//	}

		if(nodeCheckers[node.type])
		{
			nodeCheckers[node.type](node, depth);
		}

		checkChildren(node, depth);
	};

	var checkChildren = function(node, depth)
	{
		if(children[node.type] === undefined)
		{
			console.log(node);
			throw new Error("No handler for type " + node.type);
		}

		var subnodes = children[node.type];

		subnodes.filter(node.hasOwnProperty.bind(node)).forEach(function(name)
		{
			var childDepth = depth;

			if(indentChildren[node.type] && indentChildren[node.type] === name)
			{
				childDepth++;
			}

			if(Array.isArray(node[name]))
			{
				node[name].forEach(function(subnode)
				{
					checkNode(subnode, childDepth);
				});
			}
			else
			{
				checkNode(node[name], childDepth);
			}
		});
	};

	var repeat = function(input, multiplier)
	{
		return new Array(multiplier + 1).join(input);
	};

	var expect = function(type, node, expected, found, position)
	{
		var re = new RegExp(expected);
		if(!found.match(new RegExp("^" + re.source + "$")))
		{
			errors.push(getError(type, node, expected, found, position));
		}
	};

	var nodeSlice = function(node1, node2, inclusive)
	{
		if(typeof node2 !== "object")
		{
			inclusive = true;
			node2 = node1;
		}

		inclusive = !!inclusive;

		var start = inclusive ? node1.range[0] : node1.range[1];
		var end = inclusive ? node2.range[1] : node2.range[0];

		return source.slice(start, end);
	};

	/*
		Takes a set of tokens and fills in any gaps.

		So, if we are expecting an AssignmentExpression to be [Whitespace, Punctuator, Whitespace]
		but the input is actually a=b (tokens is just [Punctuator]) then this function will pad the
		tokens with some empty whitespace to give us the pattern we expect.

		Makes matching much simpler.
	*/
	var normaliseTokens = function(tokens, pattern)
	{
		var tokenIndex = 0,
			patternIndex = 0,
			output = [];

		tokens = tokens || [];

		while(patternIndex < pattern.length)
		{
			if(tokenIndex < tokens.length && tokens[tokenIndex].type === pattern[patternIndex])
			{
				output.push(tokens[tokenIndex]);
				tokenIndex++;
			}
			else
			{
				output.push({
					type: "Whitespace",
					value: "",
					range: [null, null]
				});
			}
			patternIndex++;
		}

		if(tokenIndex < tokens.length || patternIndex < pattern.length)
		{
			console.log(tokens, pattern, output);
			throw new Error("Input didn't match expected pattern");
		}

		return output;
	};

	nodeCheckers = {
		AssignmentExpression: function(node)
		{
			/*
				|     a    b         c    d
				<left><ws1><operator><ws2><right>
			*/
			var tokens = normaliseTokens(node.tokens, ["Whitespace", "Punctuator", "Whitespace"]);

			expect("whitespace", node, " ", tokens[0].value, tokens[0].range[0]);
			expect("whitespace", node, " ", tokens[2].value, tokens[2].range[0]);
		},
		BinaryExpression: function(node, depth)
		{
			if(node.operator === "instanceof" || node.operator === "in")
			{
				var tokens = normaliseTokens(node.tokens, ["Whitespace", "Keyword", "Whitespace"]);

				expect("whitespace", node, " ", tokens[0].value, tokens[0].range[0]);
				expect("whitespace", node, " ", tokens[2].value, tokens[2].range[0]);
			}
			else
			{
				return this.AssignmentExpression(node, depth);
			}
		},
		LogicalExpression: function(node, depth)
		{
			// LogicalExpressions have the exact same style and structure and AssignmentExpressions
			return this.AssignmentExpression(node, depth);
		},
		BlockStatement: function(node, depth)
		{
			/*
				{(<ws><statement)*<ws>}
			*/
			expect("syntax", node, "{", node.tokens[0].value, node.range[0]);
			expect("syntax", node, "}", node.tokens[node.tokens.length - 1].value, node.range[1]);

			var expected = "\n\n?" + repeat("\t", depth);

			for(var i = 1; i < node.tokens.length - 2; i++)
			{
				var token = node.tokens[i];
				expect("whitespace", node, expected + "\t", token.value, token.range[0]);
			}
			expect("whitespace", node, expected, node.tokens[node.tokens.length - 2].value);
		},
		DebuggerStatement: function(node)
		{
			expect("debuggerStatement", node, "", "debugger");
		},
		DoWhileStatement: function(node, depth)
		{
			/*
				do<ws1><body><ws2>while<ws3>(<ws4><test><ws5>)
			*/
			var tokens = normaliseTokens(node.tokens, [
				"Keyword", "Whitespace", "Whitespace", "Keyword", "Whitespace", "Punctuator",
				"Whitespace", "Whitespace", "Punctuator"
			]);

			var ws1 = tokens[1].value,
				ws2 = tokens[2].value,
				ws3 = tokens[4].value,
				ws4 = tokens[6].value,
				ws5 = tokens[7].value;

			expect("whitespace", node, "\n" + repeat("\t", depth), ws1);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws2);
			expect("whitespace", node, "", ws3);
			expect("whitespace", node, "", ws4);
			expect("whitespace", node, "", ws5);
		},
		EmptyStatement: function(node)
		{
			expect("emptyStatement", node, "<statement>", "");
		},
		ForInStatement: function(node, depth)
		{
			/*
				|  a    b     c     d    e f    g      h    i     j
				for<ws1>(<ws2><left><ws3>in<ws4><right><ws5>)<ws6><body>
			*/
			var tokens = normaliseTokens(node.tokens, [
				"Keyword", "Whitespace", "Punctuator", "Whitespace", "Whitespace", "Keyword",
				"Whitespace", "Whitespace", "Punctuator", "Whitespace"
			]);

			var ws1 = tokens[1].value,
				ws2 = tokens[3].value,
				ws3 = tokens[4].value,
				ws4 = tokens[6].value,
				ws5 = tokens[7].value,
				ws6 = tokens[9].value;

			if(ws3 === "")
			{
				ws3 = ws2;
				ws2 = "";
			}

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, " ", ws3);
			expect("whitespace", node, " ", ws4);
			expect("whitespace", node, "", ws5);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws6);
		},
		ForStatement: function(node, depth)
		{
			/*
				|  a    b     c     d    e     f     g    h     i       j    k     l
				for<ws1>(<ws2><init><ws3>;<ws4><test><ws5>;<ws6><update><ws7>)<ws8><body>
			*/
			var tokens = normaliseTokens(node.tokens, [
				"Keyword", "Whitespace", "Punctuator", "Whitespace", "Whitespace", "Punctuator",
				"Whitespace", "Whitespace", "Punctuator", "Whitespace", "Whitespace", "Punctuator",
				"Whitespace"
			]);

			var ws1 = tokens[1].value,
				ws2 = tokens[3].value,
				ws3 = tokens[4].value,
				ws4 = tokens[6].value,
				ws5 = tokens[7].value,
				ws6 = tokens[9].value,
				ws7 = tokens[10].value,
				ws8 = tokens[12].value;

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, "", ws3);
			expect("whitespace", node, node.test ? " " : "", ws4);
			expect("whitespace", node, "", ws5);
			expect("whitespace", node, node.update ? " " : "", ws6);
			expect("whitespace", node, "", ws7);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws8);
		},
		FunctionDeclaration: function(node, depth)
		{
			/*
				function[<ws1><id>]<ws2>(<params>)<ws3><body>
			*/

			var tokens = normaliseTokens(node.tokens, [
				"Keyword", "Whitespace", "Whitespace", "Punctuator",
				"Punctuator", "Whitespace"
			]);

			var ws1 = tokens[1].value,
				ws2 = tokens[2].value,
				ws3 = tokens[5].value;

			expect("whitespace", node, node.id ? " " : "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws3);
		},
		FunctionExpression: function(node, depth)
		{
			return this.FunctionDeclaration(node, depth);
		},
		Identifier: function(node)
		{
			// These names are exempted for jQuery and underscore compatibility
			if(node.name === "$" || node.name === "_")
			{
				return;
			}

			expect("identifierCamelCase", node, "[a-zA-Z0-9]+", node.name);
		},
		IfStatement: function(node, depth)
		{
			/*
				| a    b     c     d    e     f            g    h   i    j
				if<ws1>(<ws2><test><ws3>)<ws4><consequent>[<ws5>else<ws6><alternate>]
			*/
			var a = node.range[0] + "if".length,
				b = a + source.slice(a, node.test.range[0]).indexOf("("),
				c = node.test.range[0],
				d = node.test.range[1],
				e = d + source.slice(d, node.consequent.range[0]).indexOf(")"),
				f = node.consequent.range[0];

			var ws1 = source.slice(a, b),
				ws2 = source.slice(b + 1, c),
				ws3 = source.slice(d, e),
				ws4 = source.slice(e + 1, f);

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, "", ws3);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws4);

			if(node.alternate)
			{
				var g = node.consequent.range[1],
					h = g + source.slice(g, node.alternate.range[0]).indexOf("else"),
					i = h + "else".length,
					j = node.alternate.range[0];

				var ws5 = source.slice(g, h),
					ws6 = source.slice(i, j);

				expect("whitespace", node, "\n" + repeat("\t", depth), ws5);
				expect("whitespace", node, "\n" + repeat("\t", depth), ws6);
			}
		},
		List: function(node)
		{
			/*
				<ws1>[<wsA><item><wsB>,]*[<wsA><item>]<ws2>
			*/
			var start = 0,
				end = node.tokens.length - 1,
				tokens,
				ws1 = "",
				ws2 = "",
				wsA = "",
				wsB = "";

			if(node.items.length === 0 || node.tokens.length === 0)
			{
				tokens = normaliseTokens(node.tokens, ["Whitespace"]);
				expect("whitespace", node, "", tokens[0].value);
				return;
			}

			if(node.tokens[start].range[1] <= node.items[0].range[0])
			{
				ws1 = node.tokens[start].value;
				start++;
			}

			if(node.tokens[end].range[0] >= node.items[node.items.length - 1].range[1])
			{
				ws2 = node.tokens[end].value;
				end--;
			}

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);

			if(node.items.length === 1) return;

			var itemTokens;
			for(var i = 0; i < node.items.length - 1; i++)
			{
				itemTokens = [];
				while(node.tokens[start].value !== ",")
				{
					itemTokens.push(node.tokens[start]);
					start++;
				}
				start++;
				console.log(itemTokens);
			}

		},
		Literal: function(node)
		{
			if(typeof node.value === "string")
			{
				expect("stringsDoublequotes", node, "\".*\"",
					source.slice(node.range[0], node.range[1]));
			}
		},
		Program: function(node, depth)
		{
			// This is annoyingly similar to BlockStatement. Can almost certainly be refactored out
			/*
				{(<ws><statement)*<ws>}
			*/
			var start = node.range[0], i = 0, l = node.body.length, whitespace;

			expect("whitespace", node, "", source.slice(0, start));

			if(l === 0)
			{
				whitespace = source.slice(start, node.range[1]);
				// Whitespace for an empty program should be /\n?/
				expect("whitespace", node, "\n?", whitespace, start);
				return;
			}

			var match = "";

			for(; i < l; i++)
			{
				whitespace = source.slice(start, node.body[i].range[0]);
				expect("whitespace", node.body[i], match + repeat("\t", depth), whitespace,
					start);
				match = "\n\n?";
				start = node.body[i].range[1];
			}

			whitespace = source.slice(node.body[l - 1].range[1], node.range[1]);
		},
		UnaryExpression: function(node)
		{
			/*
				<operator><ws><argument>
			*/
			var start = node.range[0] + node.operator.length;
			var whitespace = source.slice(start, node.argument.range[0]);

			expect("whitespace", node, node.operator.length === 1 ? "" : " ", whitespace, start);
		},
		VariableDeclaration: function(node, depth)
		{
			/*
				var<ws1><declarator>(<wsA>,<wsB><declarator>)*
			*/

			if(node.declarations.length === 0)
			{
				throw new Error("VariableDeclaration with no variables");
			}

			var start = node.range[0] + "var".length,
				end = node.declarations[0].range[0];
			var ws1 = source.slice(start, end);
			var wsA, wsB, middle;

			expect("whitespace", node, " ", ws1, start);

			start = node.declarations[0].range[1];

			for(var i = 1; i < node.declarations.length; i++)
			{
				end = node.declarations[i].range[0];
				middle = source.slice(start, end).indexOf(",") + start;
				wsA = source.slice(start, middle);
				wsB = source.slice(middle + 1, end);
				expect("whitespace", node, "", wsA, start);
				expect("whitespace", node, "( |(\n" + repeat("\t", depth + 1) + "))", wsB, start);
				start = node.declarations[i].range[1];
			}
		},
		VariableDeclarator: function(node)
		{
			if(node.init)
			{
				return this.AssignmentExpression({
					left: node.id,
					right: node.init,
					operator: "=",
					range: node.range,
					loc: node.loc,
					tokens: node.tokens
				});
			}
		},
		WhileStatement: function(node, depth)
		{
			/*
				|    a    b     c     d    e     f
				while<ws1>(<ws2><test><ws3>)<ws4><body>
			*/
			var a = node.range[0] + "while".length,
				b = a + source.slice(a, node.test.range[0]).indexOf("("),
				c = node.test.range[0],
				d = node.test.range[1],
				e = d + source.slice(d, node.body.range[0]).indexOf(")"),
				f = node.body.range[0];

			var ws1 = source.slice(a, b),
				ws2 = source.slice(b + 1, c),
				ws3 = source.slice(d, e),
				ws4 = source.slice(e + 1, f);

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, "", ws3);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws4);
		},
		WithStatement: function(node, depth)
		{
			/*
				|   a    b     c       d    e     f
				with<ws1>(<ws2><object><ws3>)<ws4><body>
			*/
			var a = node.range[0] + "with".length,
				b = a + source.slice(a, node.object.range[0]).indexOf("("),
				c = node.object.range[0],
				d = node.object.range[1],
				e = d + source.slice(d, node.body.range[0]).indexOf(")"),
				f = node.body.range[0];

			var ws1 = source.slice(a, b),
				ws2 = source.slice(b + 1, c),
				ws3 = source.slice(d, e),
				ws4 = source.slice(e + 1, f);

			expect("whitespace", node, "", ws1);
			expect("whitespace", node, "", ws2);
			expect("whitespace", node, "", ws3);
			expect("whitespace", node, "\n" + repeat("\t", depth), ws4);
		}
	};

	checkNode(parseTree, 0);

	return errors;
};

