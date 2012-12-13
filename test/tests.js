/*global suite, test*/
"use strict";
var assert = require("chai").assert;
var styleguru = require("../lib/styleguru.js");
var fs = require("fs");

suite("Basics", function()
{
	suite("parse()", function()
	{
		var source = fs.readFileSync(__dirname + "/../lib/styleguru.js").toString();

		test("parse() method should exist", function()
		{
			assert.ok(styleguru.parse);
			assert.isFunction(styleguru.parse);
		});

		test("parse() returns an array", function()
		{
			assert.isArray(styleguru.parse(""));
		});

		test.skip("invalid JS returns an error", function()
		{
			assert.deepEqual(styleguru.parse("fi"), []);
		});

		test.skip("styleguru source code passes default lint", function()
		{
			assert.lengthOf(styleguru.parse(source), 0);
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
				styleguru.messages.logicalOperatorSingleSpaceBeforeAfter);
		});
	});

	suite("For ... in statements", function()
	{
		test("accepts valid statement", function()
		{
			var statement = "for(var i in foo)\n{\n}";

			assert.lengthOf(styleguru.parse(statement), 0);
		});

		test.skip("fail on bad whitespace", function()
		{
			assert.lengthOf(styleguru.parse("for(var  i in \tfoo) {}"), 0);
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
});
