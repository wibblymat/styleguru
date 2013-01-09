/*global suite, test*/
"use strict";
var assert = require("chai").assert;
var fs = require("fs");

var path = process.env.STYLEGURU_COVERAGE ? "../lib-coverage" : "../lib";
var styleguru = require(path + "/styleguru.js");

var fixtures = {
	"styleguru": fs.readFileSync(__dirname + "/../lib/styleguru.js").toString(),
	"sample": fs.readFileSync(__dirname + "/fixtures/sample.js").toString(),
	"basic": fs.readFileSync(__dirname + "/fixtures/basic.js").toString()
};

suite("Basics", function()
{
	suite("smoke tests", function()
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

		test.skip("styleguru source code passes default lint", function()
		{
			assert.lengthOf(styleguru.parse(fixtures.styleguru), 0);
		});

		test.skip("all basic language features can pass", function()
		{
			assert.lengthOf(styleguru.parse(fixtures.basic), 0);
		});
	});
});

suite("Tree manipulation", function()
{
	var transform = require(path + "/tree-transform.js").transform;
	var esprima = require("esprima");
	var parse = function(source)
	{
		return transform(esprima.parse(source, {
			comment: true,
			range: true,
			loc: true,
			tolerant: true,
			tokens: true
		}), source);
	};

	suite("insert tokens into nodes", function()
	{
		var example = parse("if(true){a;}");
		test("program node has a tokens collection", function()
		{
			assert.ok(example.tokens);
		});

		test("other nodes have tokens collections", function()
		{
			assert.ok(example.body[0].tokens);
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
				styleguru.messages.whitespace);
		});

		test("must have space after", function()
		{
			assert.equal(styleguru.parse("a *b")[0].type,
				styleguru.messages.whitespace);
		});

		test("must have both spaces", function()
		{
			assert.equal(styleguru.parse("a*b")[0].type,
				styleguru.messages.whitespace);
		});

		test("must be only one space before", function()
		{
			assert.equal(styleguru.parse("a  * b")[0].type,
				styleguru.messages.whitespace);
		});

		test("must be only one space after", function()
		{
			assert.equal(styleguru.parse("a *  b")[0].type,
				styleguru.messages.whitespace);
		});

		test("cannot use tabs", function()
		{
			assert.equal(styleguru.parse("a	*	b")[0].type,
				styleguru.messages.whitespace);
		});

		test.skip("handle parentheses", function()
		{
			assert.lengthOf(styleguru.parse("a + (a + b)"), 0);
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
				styleguru.messages.whitespace);
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
				styleguru.messages.whitespace);
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
				styleguru.messages.whitespace);
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
			assert.lengthOf(result, 4);
			assert.equal(result[0].type, styleguru.messages.whitespace);
			assert.equal(result[1].type, styleguru.messages.whitespace);
			assert.equal(result[2].type, styleguru.messages.whitespace);
			assert.equal(result[3].type, styleguru.messages.whitespace);
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
		test("accepts valid expression", function()
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

	suite("Assignment", function()
	{
		test("simple", function()
		{
			assert.lengthOf(styleguru.parse("a = 1"), 0);
			assert.lengthOf(styleguru.parse("a = \"1\""), 0);
			assert.lengthOf(styleguru.parse("a = b"), 0);
			assert.lengthOf(styleguru.parse("a = true"), 0);
		});

		test("function expression", function()
		{
			assert.lengthOf(styleguru.parse("var a = function(x)\n{\n\treturn x;\n};\n"), 0);
		});

		test("fail on bad whitespace", function()
		{
			assert.lengthOf(styleguru.parse("a=1"), 2);
			assert.lengthOf(styleguru.parse("a =1"), 1);
			assert.lengthOf(styleguru.parse("a= 1"), 1);
		});
	});

	suite("Var statements", function()
	{
		test("single item, no init", function()
		{
			assert.lengthOf(styleguru.parse("var x"), 0);
		});

		test("single item, init", function()
		{
			assert.lengthOf(styleguru.parse("var x = 1"), 0);
		});

		test("two items, no init", function()
		{
			assert.lengthOf(styleguru.parse("var x, y;"), 0);
		});

		test("two items, init", function()
		{
			assert.lengthOf(styleguru.parse("var x = 1, y = 2;"), 0);
		});

		test("two items, split on multiple lines", function()
		{
			assert.lengthOf(styleguru.parse("var x = 1,\n\ty = 2;"), 0);
		});

		test("incorrect single item, no init", function()
		{
			assert.lengthOf(styleguru.parse("var  x"), 1);
		});

		test("incorrect single item, init", function()
		{
			assert.lengthOf(styleguru.parse("var x =  1"), 1);
		});

		test("incorrect two items, no init", function()
		{
			assert.lengthOf(styleguru.parse("var x,y;"), 1);
		});

		test("incorrect two items, init", function()
		{
			assert.lengthOf(styleguru.parse("var\tx=1,  y =2;"), 5);
		});

		test("incorrect two items, split on multiple lines", function()
		{
			assert.lengthOf(styleguru.parse("var x = 1,\ny = 2;"), 1);
		});
	});

	suite("Blocks", function()
	{
		test("braces on their own lines", function()
		{
			var block = "{\n\tx++;\n}\n";
			assert.lengthOf(styleguru.parse(block), 0);
			assert.lengthOf(styleguru.parse("while(true)\n" + block), 0);
			assert.lengthOf(styleguru.parse("if(true)\n" + block), 0);
			assert.lengthOf(styleguru.parse("function a()\n" + block), 0);
			assert.lengthOf(styleguru.parse("var a = function()\n" + block), 0);
			assert.lengthOf(styleguru.parse("for(var i = 0; i++; i < 20)\n" + block), 0);
			assert.lengthOf(styleguru.parse("for(var i in window)\n" + block), 0);
			assert.lengthOf(styleguru.parse("do\n" + block + "while(true)\n"), 0);
			assert.lengthOf(styleguru.parse("with(window)\n" + block), 0);
		});

		test("braces in the wrong place", function()
		{
			var block = " {\n\tx++;\n}\n";
			assert.lengthOf(styleguru.parse(block), 1);
			assert.lengthOf(styleguru.parse("while(true)" + block), 1);
			assert.lengthOf(styleguru.parse("if(true)" + block), 1);
			assert.lengthOf(styleguru.parse("if(true)" + block + "else" + block), 2);
			assert.lengthOf(styleguru.parse("function a()" + block), 1);
			assert.lengthOf(styleguru.parse("var a = function()" + block), 1);
			assert.lengthOf(styleguru.parse("for(var i = 0; i++; i < 20)" + block), 1);
			assert.lengthOf(styleguru.parse("for(var i in window)" + block), 1);
			assert.lengthOf(styleguru.parse("do" + block + "while(true)\n"), 1);
			assert.lengthOf(styleguru.parse("with(window)" + block), 1);
		});

	});

	suite("Functions", function()
	{
		test("parameters", function()
		{
			assert.lengthOf(styleguru.parse("var cow = function( name, date )\n{\n};"), 2);
			assert.lengthOf(styleguru.parse("var cow = function( name, date)\n{\n};"), 1);
			assert.lengthOf(styleguru.parse("var cow = function(name, date )\n{\n};"), 1);
			assert.lengthOf(styleguru.parse("var cow = function(name, date)\n{\n};"), 0);
			assert.lengthOf(styleguru.parse("var cow = function(name,date)\n{\n};"), 1);
			assert.lengthOf(styleguru.parse("var cow = function( )\n{\n};"), 1);
			assert.lengthOf(styleguru.parse("var cow = function()\n{\n};"), 0);
		});
	});
});
