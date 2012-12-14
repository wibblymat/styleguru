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
	newlineAfterOpenBrace: "Opening braces should be followed by a newline",
	identifierCamelCase: "Identifiers should be in camelCase",
	emptyStatement: "Empty statement",
	singleSpace: "Use single spaces to seperate code within a line"
};
exports.messages = messages;

exports.parse = function(source, options)
{
	var nodeCheckers;
	var rules = {
		"identifierCamelCase": true,
	};
	var parseTree = esprima.parse(source, {
		comment: true,
		range: true,
		loc: true
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

		if(nodeCheckers[node.type] === undefined)
		{
			console.log(node);
			throw new Error("No handler for type " + node.type);
		}

		return nodeCheckers[node.type](node, depth);
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
		while(source[end].match(/\s/)) end++;

		return [source.slice(start, node.range[0]), source.slice(node.range[1], end)];
	};
	// Only exported for tests, probably a terrible idea
	exports.getSurroundingWhitespace = getSurroundingWhitespace;

	nodeCheckers = {
		ArrayExpression: function(node, depth)
		{
			var errors = [];

			node.elements.forEach(function(element)
			{
				errors = errors.concat(checkNode(element, depth));
			});

			return errors;
		},
		AssignmentExpression: function(node, depth)
		{
			return checkNode(node.left, depth).concat(checkNode(node.right, depth));
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
			return errors.concat(checkNode(node.left, depth), checkNode(node.right, depth));
		},
		BlockStatement: function(node, depth)
		{
			var errors = [];

			if(source.slice(node.range[0], node.range[0] + 2) !== "{\n")
			{
				errors.push(getError(
					"newlineAfterOpenBrace",
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

				// We account for possibly having a blank line above us - though no more
				if(found !== expected && found !== "\n" + expected)
				{
					errors.push(getError(
						"badIndentation",
						node,
						expected,
						found
					));
				}
				errors = errors.concat(checkNode(node, depth + 1));
				position = node.range[1];
			});

			return errors;
		},
		BreakStatement: function(node, depth)
		{
			if(node.label)
			{
				return checkNode(node.label, depth);
			}

			return [];
		},
		CallExpression: function(node, depth)
		{
			var errors = [];

			node.arguments.forEach(function(argument)
			{
				errors = errors.concat(checkNode(argument, depth));
			});

			return errors.concat(checkNode(node.callee, depth));
		},
		CatchClause: function(node, depth)
		{
			return [].concat(checkNode(node.param, depth), checkNode(node.body, depth));
		},
		ConditionalExpression: function(node, depth)
		{
			var errors = [];
			return errors.concat(
				checkNode(node.test, depth),
				checkNode(node.consequent, depth),
				checkNode(node.alternate, depth)
			);
		},
		ContinueStatement: function(node, depth)
		{
			if(node.label)
			{
				return checkNode(node.label, depth);
			}

			return [];
		},
		DebuggerStatement: function()
		{
			return [];
		},
		DoWhileStatement: function(node, depth)
		{
			return [].concat(checkNode(node.body, depth), checkNode(node.test, depth));
		},
		EmptyStatement: function(node/*, depth*/)
		{
			return [getError("emptyStatement", node)];
		},
		ExpressionStatement: function(node, depth)
		{
			return checkNode(node.expression, depth);
		},
		ForInStatement: function(node, depth)
		{
			var errors = [];

			var middle = getInternalWhitespace(node.left.range[1], node.right.range[0], source);

			if(middle !== " in ")
			{
				errors.push(getError("singleSpace", node, " in ", middle));
			}

			return errors.concat(
				checkNode(node.left, depth),
				checkNode(node.right, depth),
				checkNode(node.body, depth)
			);
		},
		ForStatement: function(node, depth)
		{
			return checkNode(node.init, depth).concat(checkNode(node.test, depth),
				checkNode(node.update, depth), checkNode(node.body, depth));
		},
		FunctionDeclaration: function(node, depth)
		{
			var errors = [];

			node.params.forEach(function(param)
			{
				errors = errors.concat(checkNode(param, depth));
			}, this);

			return errors.concat(checkNode(node.id, depth), checkNode(node.body, depth));
		},
		FunctionExpression: function(node, depth)
		{
			var errors = [];

			node.params.forEach(function(param)
			{
				errors = errors.concat(checkNode(param, depth));
			});

			return errors.concat(checkNode(node.body, depth));
		},
		Identifier: function(node/*, depth*/)
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
		IfStatement: function(node, depth)
		{
			return checkNode(node.test, depth).concat(checkNode(node.consequent, depth),
				checkNode(node.alternate, depth));
		},
		LabeledStatement: function(node, depth)
		{
			return [].concat(checkNode(node.label, depth), checkNode(node.body, depth));
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
		MemberExpression: function(node, depth)
		{
			return checkNode(node.object, depth).concat(checkNode(node.property, depth));
		},
		NewExpression: function(node, depth)
		{
			var errors = [];

			node.arguments.forEach(function(argument)
			{
				errors = errors.concat(checkNode(argument, depth));
			}, this);

			return errors.concat(checkNode(node.callee, depth));
		},
		ObjectExpression: function(node, depth)
		{
			var errors = [];

			node.properties.forEach(function(property)
			{
				errors = errors.concat(checkNode(property, depth + 1));
			});

			return errors;
		},
		Program: function(node, depth)
		{
			var errors = [];

			node.body.forEach(function(node)
			{
				errors = errors.concat(checkNode(node, depth));
			});

			return errors;
		},
		Property: function(node, depth)
		{
			return checkNode(node.key, depth).concat(checkNode(node.value, depth));
		},
		ReturnStatement: function(node, depth)
		{
			return checkNode(node.argument, depth);
		},
		SwitchCase: function(node, depth)
		{
			return [].concat(checkNode(node.test, depth), checkNode(node.consequent, depth));
		},
		SwitchStatement: function(node, depth)
		{
			var errors = [];

			node.cases.forEach(function(switchCase)
			{
				errors = errors.concat(checkNode(switchCase, depth));
			});

			return errors.concat(checkNode(node.discriminant, depth));
		},
		ThisExpression: function()
		{
			// ThisExpression is literally just 'this'
			return [];
		},
		ThrowStatement: function(node, depth)
		{
			var errors = [];

			return errors.concat(checkNode(node.argument, depth));
		},
		TryStatement: function(node, depth)
		{
			var errors = [];

			node.handlers.forEach(function(handler)
			{
				errors = errors.concat(checkNode(handler, depth));
			}, this);

			return errors.concat(checkNode(node.block, depth), checkNode(node.finalizer, depth));
		},
		UnaryExpression: function(node, depth)
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
			return errors.concat(checkNode(node.argument, depth));
		},
		UpdateExpression: function(node, depth)
		{
			return checkNode(node.argument, depth);
		},
		VariableDeclaration: function(node, depth)
		{
			var errors = [];

			node.declarations.forEach(function(declaration)
			{
				errors = errors.concat(checkNode(declaration, depth));
			});

			return errors;
		},
		VariableDeclarator: function(node, depth)
		{
			return checkNode(node.id, depth).concat(checkNode(node.init, depth));
		},
		WhileStatement: function(node, depth)
		{
			return checkNode(node.test, depth).concat(checkNode(node.body, depth));
		},
		WithStatement: function(node, depth)
		{
			return checkNode(node.object, depth).concat(checkNode(node.body, depth));
		}
	};

	return checkNode(parseTree, 0);
};

