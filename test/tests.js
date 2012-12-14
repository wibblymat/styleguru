/*global suite, test*/
"use strict";
var assert = require("chai").assert;
var styleguru = require("../lib/styleguru.js");
var fs = require("fs");

var fixtures = {
	"styleguru": fs.readFileSync(__dirname + "/../lib/styleguru.js").toString(),
	"sample": fs.readFileSync(__dirname + "/fixtures/sample.js").toString(),
	"basic": fs.readFileSync(__dirname + "/fixtures/basic.js").toString()
};

suite("Basics", function()
{
	suite("parse()", function()
	{
		test("parse() method should exist", function()
		{
			assert.ok(styleguru.parse);
			assert.isFunction(styleguru.parse);
		});

		test("parse() returns an array", function()
		{
			assert.isArray(styleguru.parse(""));
		});

		test("invalid JS returns an error", function()
		{
			assert.Throw(styleguru.parse.bind(null, "if(;)"), Error, /Unexpected token/);
		});

		test("styleguru source code passes default lint", function()
		{
			assert.lengthOf(styleguru.parse(fixtures.styleguru), 0);
		});

		test("all basic language features can pass", function()
		{
			assert.lengthOf(styleguru.parse(fixtures.basic), 0);
		});
	});
});

suite("Whitespace detection", function()
{
	var whitespaceSource = "a;  a;a   ;\ta;\n\t\ta ;";
	var nodes = {
		"none": {range: [0, 1]},
		"before": {range: [4, 5]},
		"after": {range: [6, 7]},
		"tab": {range: [12, 13]},
		"newlineTab": {range: [17, 18]},
	};

	suite("Preceding whitespace", function()
	{
		test("detects absence of whitespace", function()
		{
			assert.deepEqual(
				styleguru.getSurroundingWhitespace(nodes.none, whitespaceSource),
				["", ""]
			);
		});

		test("detects whitespace before", function()
		{
			assert.deepEqual(
				styleguru.getSurroundingWhitespace(nodes.before, whitespaceSource),
				["  ", ""]
			);
		});

		test("detects whitespace after", function()
		{
			assert.deepEqual(
				styleguru.getSurroundingWhitespace(nodes.after, whitespaceSource),
				["", "   "]
			);
		});

		test("detects tabs", function()
		{
			assert.deepEqual(
				styleguru.getSurroundingWhitespace(nodes.tab, whitespaceSource),
				["\t", ""]
			);
		});

		test("detects mixed", function()
		{
			assert.deepEqual(
				styleguru.getSurroundingWhitespace(nodes.newlineTab, whitespaceSource),
				["\n\t\t", " "]
			);
		});
	});
});

suite("Default style", function()
{
	suite("Quotes", function()
	{
		var result = styleguru.parse("'use strict';");

		test("only one error", function()
		{
			assert.lengthOf(result, 1);
		});

		test("enforce double quotes", function()
		{
			assert.propertyVal(result[0], "type",
				styleguru.messages.stringsDoublequotes);
		});

		test("double quotes pass", function()
		{
			assert.lengthOf(styleguru.parse("\"use strict\";"), 0);
		});
	});

	suite("Binary operators", function()
	{
		test("accepts correct spaces", function()
		{
			assert.lengthOf(styleguru.parse("a * b"), 0);
		});

		test("must have space before", function()
		{
			assert.equal(styleguru.parse("a* b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});

		test("must have space after", function()
		{
			assert.equal(styleguru.parse("a *b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});

		test("must have both spaces", function()
		{
			assert.equal(styleguru.parse("a*b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});

		test("must be only one space before", function()
		{
			assert.equal(styleguru.parse("a  * b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});

		test("must be only one space after", function()
		{
			assert.equal(styleguru.parse("a *  b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});

		test("cannot use tabs", function()
		{
			assert.equal(styleguru.parse("a	*	b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});
	});

	suite("Symbol unary operators", function()
	{
		test("accepts no spaces", function()
		{
			assert.lengthOf(styleguru.parse("!a"), 0);
		});

		test("must not have spaces", function()
		{
			assert.lengthOf(styleguru.parse("! a"), 1);
			assert.equal(styleguru.parse("! a")[0].type,
				styleguru.messages.symbolUnaryNoSpaces);
		});

		test("accepts prefix operators", function()
		{
			assert.lengthOf(styleguru.parse("++a"), 0);
		});

		test("accepts postfix operators", function()
		{
			assert.lengthOf(styleguru.parse("a++"), 0);
		});
	});

	suite("Word unary operators", function()
	{
		test("delete allowed a space", function()
		{
			assert.lengthOf(styleguru.parse("delete a[0];"), 0);
		});

		test("delete must have only one space", function()
		{
			assert.equal(styleguru.parse("delete     a[0];")[0].type,
				styleguru.messages.wordUnaryOneSpace);
		});
	});

	suite("Logical expressions", function()
	{
		test("spaces around operator allowed", function()
		{
			assert.lengthOf(styleguru.parse("a && b"), 0);
		});

		test("spaces around operator enforced", function()
		{
			assert.equal(styleguru.parse("a&&b")[0].type,
				styleguru.messages.operatorSingleSpaceBeforeAfter);
		});
	});

	suite("For ... in statements", function()
	{
		test("accepts valid statement", function()
		{
			var statement = "for(var i in foo)\n{\n}";

			assert.lengthOf(styleguru.parse(statement), 0);
		});

		test("fail on bad whitespace", function()
		{
			var result = styleguru.parse("for(var  i in \tfoo) {}");
			assert.lengthOf(result, 2);
			assert.equal(result[0].type, styleguru.messages.singleSpace);
			assert.equal(result[1].type, styleguru.messages.newlineAfterOpenBrace);
		});
	});

	suite("Throw statement", function()
	{
		test("accepts valid statement", function()
		{
			assert.lengthOf(styleguru.parse("throw {};"), 0);
		});
	});

	suite("New expression", function()
	{
		test("acceptes valid expression", function()
		{
			assert.lengthOf(styleguru.parse("new Array()"), 0);
		});
	});

	suite("Identifiers", function()
	{
		test("accepts camelCase identifier", function()
		{
			assert.lengthOf(styleguru.parse("var fooBar = 1;"), 0);
			assert.lengthOf(styleguru.parse("var foo = 1;"), 0);
			assert.lengthOf(styleguru.parse("var fOO = 1;"), 0);
		});

		test("accepts TitleCase identifier", function()
		{
			assert.lengthOf(styleguru.parse("a = new XMLHttpRequest();"), 0);
		});

		test("accepts $ or _", function()
		{
			assert.lengthOf(styleguru.parse("var $ = 1"), 0);
			assert.lengthOf(styleguru.parse("var _ = 1"), 0);
		});

		test("rejects $ or _ in a longer name", function()
		{
			assert.equal(styleguru.parse("$e")[0].type,
				styleguru.messages.identifierCamelCase);
		});
	});
});
