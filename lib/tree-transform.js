"use strict";

var setTokens = function(node, tokens)
{
	var i;

	if(typeof node !== "object")
	{
		return;
	}

	for(i in node)
	{
		if(i !== "range" && i !== "loc" && i !== "type" && node[i])
		{
			setTokens(node[i], tokens);
		}
	}

	if(node.range)
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
	}
};

var addWhitespace = function(tokens, source)
{
	var re = new RegExp("(\\s+)", "g"),
		match,
		index = 0,
		newTokens = [];

	while((match = re.exec(source)) !== null)
	{
		while(index < tokens.length && tokens[index].range[0] < match.index)
		{
			newTokens.push(tokens[index]);
			index++;
		}

		newTokens.push({
			type: "Whitespace",
			range: [match.index, match.index + match[1].length],
			value: match[1]
		});
	}

	while(index < tokens.length)
	{
		newTokens.push(tokens[index]);
		index++;
	}

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
