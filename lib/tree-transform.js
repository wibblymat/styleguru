"use strict";

var getChildren = function(node)
{
	var name,
		result = [];

	if(Array.isArray(node))
	{
		return node;
	}

	for(name in node)
	{
		if(
			name !== "range" &&
			name !== "loc" &&
			name !== "type" &&
			node[name] &&
			typeof node[name] === "object")
		{
			result.push(node[name]);
		}
	}

	return result;
};

var addTokens = function(node, tokens)
{
	node.tokens = [];
	for(var index = tokens.length - 1; index >= 0; index--)
	{
		var token = tokens[index];
		if(token.range[0] >= node.range[0] && token.range[1] <= node.range[1])
		{
			node.tokens.unshift(token);
			tokens.splice(index, 1);
		}
	}
};

var extractParameters = function(node, propertyName)
{
	var first = 0,
		last = node.tokens.length - 1,
		start,
		end,
		items = node[propertyName] || [];

	while(node.tokens[first].value !== "(") first++;
	while(node.tokens[last].value !== ")") last--;

	start = node.tokens[first].range[1];
	end = node.tokens[last].range[0];

	var list = {
		type: "List",
		range: [start, end],
		loc: node.loc,
		items: items,
		tokens: node.tokens.splice(first + 1, last - first - 1)
	};

	node[propertyName ] = list;
};

var updateTree = function(node)
{
	if(node.type === "FunctionExpression" || node.type === "FunctionDeclaration")
	{
		extractParameters(node, "params");
	}
	else if(node.type === "CallExpression")
	{
		extractParameters(node, "arguments");
	}
};

var setTokens = function(node, tokens)
{

	getChildren(node).forEach(function(node)
	{
		setTokens(node, tokens);
	});


	if(!node.range) return;

	addTokens(node, tokens);
	updateTree(node);
};

var WhitespaceToken = function(start, length, value)
{
	this.type = "Whitespace";
	this.range = [start, start + length];
	this.value = value;
};

var pushTokens = function(source, target, start, end)
{
	var current = start;

	while(current < source.length && source[current].range[0] < end)
	{
		target.push(source[current]);
		current++;
	}

	return current;
};

var addWhitespace = function(tokens, source)
{
	var re = new RegExp("(\\s+)", "g"),
		match,
		index = 0,
		newTokens = [];

	while((match = re.exec(source)) !== null)
	{
		index = pushTokens(tokens, newTokens, index, match.index);
		newTokens.push(new WhitespaceToken(match.index, match[1].length, match[1]));
	}
	pushTokens(tokens, newTokens, index, source.length);

	return newTokens;
};

exports.transform = function(parseTree, source)
{
	var tokens = addWhitespace(parseTree.tokens, source);
	var node = {
		type: parseTree.type,
		range: [0, source.length],
		loc: parseTree.loc,
		body: parseTree.body
	};
	setTokens(node, tokens);
	return node;
};
