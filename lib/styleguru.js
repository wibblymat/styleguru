"use strict";
var esprima = require("esprima");

var messages = {
	badIndentation: "Lines should be properly indented with tabs",
	stringsDoublequotes: "Strings should use doublequotes",
	operatorSingleSpaceBeforeAfter: "Binary operators should be surrounded by spaces",
	symbolUnaryNoSpaces: "Single character unary operators (!, +, -, ~) must not have a space" +
		" before the argument",
	wordUnaryOneSpace: "Word unary operators (delete, void, typeof) must have a space before" +
		" the argument",
	newlineAfterOpenBrace: "Opening braces should be followed by a newline",
	identifierCamelCase: "Identifiers should be in camelCase",
	emptyStatement: "Empty statement",
	logicalOperatorSingleSpaceBeforeAfter: "Logical operators should be surrounded by spaces"
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
			var operator = source.slice(node.left.range[1], node.right.range[0]);
			var errors = [];
			if(operator !== " " + node.operator + " ")
			{
				errors.push(getError("operatorSingleSpaceBeforeAfter", node));
			}
			return errors.concat(checkNode(node.left, depth), checkNode(node.right, depth));
		},
		BlockStatement: function(node, depth)
		{
			var errors = [];

			if(source.slice(node.range[0], node.range[0] + 2) !== "{\n")
			{
				errors.push(getError("newlineAfterOpenBrace", node));
			}

			var position = node.range[0] + 1;

			node.body.forEach(function(node)
			{
				if(source.slice(position, node.range[0]) !== "\n" + repeat("\t", depth + 1))
				{
					errors.push(getError(
						"badIndentation",
						node,
						"\n" + repeat("\t", depth + 1),
						source.slice(position, node.range[0])
					));
				}
				errors = errors.concat(checkNode(node, depth + 1));
				position = node.range[1];
			});

			return errors;
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
			// Check identifier style
			if(rules.identifierCamelCase && !node.name.match(/^[a-zA-Z0-9]+$/))
			{
				return [getError("identifierCamelCase", node)];
			}
			return [];
		},
		IfStatement: function(node, depth)
		{
			return checkNode(node.test, depth).concat(checkNode(node.consequent, depth),
				checkNode(node.alternate, depth));
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
					return [getError("stringsDoublequotes", node)];
				}
			}
			return [];
		},
		LogicalExpression: function(node)
		{
			var errors = [];

			if(source.slice(node.left.range[1], node.right.range[0]) !== " " + node.operator + " ")
			{
				errors.push(getError(
					"logicalOperatorSingleSpaceBeforeAfter",
					node,
					" " + node.operator + " ",
					source.slice(node.left.range[1], node.right.range[0])
				));
			}

			return errors.concat(checkNode(node.left), checkNode(node.right));
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
				errors = errors.concat(checkNode(property, depth));
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
		UnaryExpression: function(node, depth)
		{
			var found = source.slice(node.range[0], node.range[1]);
			var errors = [], type = "symbolUnaryNoSpaces", expected;

			if(node.operator.length > 1)
			{
				type = "wordUnaryOneSpace";
				expected = node.operator + " " +
					source.slice(node.argument.range[0], node.argument.range[1]);
			}
			else
			{
				expected = node.operator +
					source.slice(node.argument.range[0], node.argument.range[1]);
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
		}
	};

	return checkNode(parseTree, 0);
};

