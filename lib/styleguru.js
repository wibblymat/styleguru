"use strict";
var esprima = require("esprima");

var messages = {
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
	var nodeCheckers;
	var rules = {
		"identifierCamelCase": true,
	};
	var parseTree = esprima.parse(source, {
		comment: true,
		range: true,
		loc: true,
		tolerant: true
	});

	// TODO: now patch the parse tree to include comments, newlines, whitespace, etc.
	// Maybe?

	for(var name in options)
	{
		rules[name] = options[name];
	}

	var getError = function(type, node, expected, found)
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
			column: node.loc.start.column
		};
	};

	var checkNode = function(node, depth)
	{
		if(!(node instanceof Object) || !node.type)
		{
			return [];
		}

		var errors = [];

		if(nodeCheckers[node.type])
		{
			errors = errors.concat(nodeCheckers[node.type](node, depth));
		}

		return errors.concat(checkChildren(node, depth));
	};

	var checkChildren = function(node, depth)
	{
		if(children[node.type] === undefined)
		{
			console.log(node);
			throw new Error("No handler for type " + node.type);
		}

		var errors = [],
			subnodes = children[node.type];

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
					errors = errors.concat(checkNode(subnode, childDepth));
				});
			}
			else
			{
				errors = errors.concat(checkNode(node[name], childDepth));
			}
		});

		return errors;
	};

	var repeat = function(input, multiplier)
	{
		return new Array(multiplier + 1).join(input);
	};

	var getInternalWhitespace = function(start, end, source)
	{
		while(start < end && !source[start].match(/\s/)) start++;
		while(end > start && !source[end - 1].match(/\s/)) end--;

		return source.slice(start, end);
	};

	var getSurroundingWhitespace = function(node, source)
	{
		var start = node.range[0],
			end = node.range[1];

		while(start > 0 && source[start - 1].match(/\s/)) start--;
		while(end < source.length && source[end].match(/\s/)) end++;

		return [source.slice(start, node.range[0]), source.slice(node.range[1], end)];
	};

	nodeCheckers = {
		AssignmentExpression: function(node)
		{
			var whitespace = getInternalWhitespace(node.left.range[1], node.right.range[0], source);
			var errors = [];
			if(whitespace !== " " + node.operator + " ")
			{
				errors.push(getError(
					"operatorSingleSpaceBeforeAfter",
					node,
					" " + node.operator + " ",
					whitespace
				));
			}

			return errors;
		},
		BinaryExpression: function(node, depth)
		{
			var operator = getInternalWhitespace(node.left.range[1], node.right.range[0], source);
			var errors = [];
			if(operator !== " " + node.operator + " ")
			{
				// It is possible that we are wrapping a line and that the operator is left
				// dangling at the end of a line
				if(operator !== " " + node.operator + "\n" + repeat("\t", depth + 1))
				{
					errors.push(getError(
						"operatorSingleSpaceBeforeAfter",
						node,
						" " + node.operator + " ",
						operator
					));
				}
			}
			return errors;
		},
		BlockStatement: function(node, depth)
		{
			var errors = [];

			var whitespace = getSurroundingWhitespace(node, source);

			if(node.range[0] !== 0 && whitespace[0] !== "\n" + repeat("\t", depth))
			{
				errors.push(getError(
					"braceOwnLine",
					node,
					"\n",
					whitespace[0]
				));
			}

			if(source.slice(node.range[0], node.range[0] + 2) !== "{\n")
			{
				errors.push(getError(
					"braceOwnLine",
					node,
					"{\n",
					source.slice(node.range[0], node.range[0] + 2)
				));
			}

			var position = node.range[0] + 1;

			node.body.forEach(function(node)
			{
				var expected = "\n" + repeat("\t", depth + 1);
				var found = getSurroundingWhitespace(node, source)[0];

				// We account for possibly having one blank line above us - though no more
				if(found !== expected && found !== "\n" + expected)
				{
					errors.push(getError(
						"badIndentation",
						node,
						expected,
						found
					));
				}
				position = node.range[1];
			});

			return errors;
		},
		EmptyStatement: function(node/**/)
		{
			return [getError("emptyStatement", node, "<statement>", "")];
		},
		ForInStatement: function(node)
		{
			var errors = [];

			var middle = getInternalWhitespace(node.left.range[1], node.right.range[0], source);

			if(middle !== " in ")
			{
				errors.push(getError("singleSpace", node, " in ", middle));
			}

			return errors;
		},
		Identifier: function(node/**/)
		{
			// These names are exempted for jQuery and underscore compatibility
			if(node.name === "$" || node.name === "_")
			{
				return [];
			}

			// Check identifier style
			if(rules.identifierCamelCase && !node.name.match(/^[a-zA-Z0-9]+$/))
			{
				return [getError("identifierCamelCase", node, "/^[a-zA-Z0-9]+$/", node.name)];
			}
			return [];
		},
		Literal: function(node)
		{
			if(typeof node.value === "string")
			{
				if(
					source.slice(node.range[0], node.range[0] + 1) !== "\"" ||
					source.slice(node.range[1] - 1, node.range[1]) !== "\""
				)
				{
					return [getError(
						"stringsDoublequotes",
						node,
						"\"" + node.value + "\"",
						source.slice(node.range[0], node.range[1])
					)];
				}
			}
			return [];
		},
		LogicalExpression: function(node, depth)
		{
			// LogicalExpressions have the exact same style and structure and BinaryExpressions
			return this.BinaryExpression(node, depth);
		},
		Program: function(node, depth)
		{
			var errors = [];

			var position = node.range[0];

			node.body.forEach(function(node)
			{
				var expected = "\n" + repeat("\t", depth);
				var found = getSurroundingWhitespace(node, source)[0];

				// We account for possibly having one blank line above us - though no more
				if(position > 0 && found !== expected && found !== "\n" + expected)
				{
					errors.push(getError(
						"badIndentation",
						node,
						expected,
						found
					));
				}
				position = node.range[1];
			});
			return errors;
		},
		UnaryExpression: function(node)
		{
			var found = getInternalWhitespace(node.range[0], node.argument.range[0], source);
			var errors = [], type = "symbolUnaryNoSpaces", expected;

			if(node.operator.length > 1)
			{
				type = "wordUnaryOneSpace";
				expected = " ";
			}
			else
			{
				expected = "";
			}

			if(found !== expected)
			{
				errors.push(getError(type, node, expected, found));
			}
			return errors;
		},
		VariableDeclaration: function(node, depth)
		{
			var errors = [];

			var initial = getInternalWhitespace(node.range[0], node.declarations[0].range[0],
				source);

			if(initial !== " ")
			{
				errors.push(getError(
					"singleSpace",
					node,
					" ",
					initial
				));
			}

			var position = node.declarations[0].range[0];

			node.declarations.forEach(function(declaration, index)
			{
				var seperator = source[position] +
					getInternalWhitespace(position, declaration.range[0], source);
				var whitespace = getSurroundingWhitespace(declaration, source);

				if((index !== node.declarations.length - 1 && whitespace[1] !== "") ||
					(index !== 0 && seperator !== ", " &&
					seperator !== ",\n" + repeat("\t", depth + 1))
				)
				{
					errors.push(getError(
						"singleSpace",
						node,
						", ",
						seperator
					));
				}

				position = declaration.range[1];
			});

			return errors;
		},
		VariableDeclarator: function(node)
		{
			var errors = [];
			if(node.init)
			{
				var assignment = getInternalWhitespace(
					node.id.range[1], node.init.range[0], source);
				if(assignment !== " = ")
				{
					errors.push(getError(
						"operatorSingleSpaceBeforeAfter",
						node,
						" = ",
						assignment
					));
				}
			}

			return errors;
		}
	};

	return checkNode(parseTree, 0);
};

