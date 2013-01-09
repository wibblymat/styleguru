#!/usr/bin/env node
"use strict";

if(process.argv.length < 3)
{
	console.log("Must specify a file");
	process.exit(1);
}

var fs = require("fs");
var util = require("util");
var transform = require("../lib/tree-transform.js").transform;
var esprima = require("esprima");
var source = fs.readFileSync(process.argv[2], "utf-8");

console.log(util.inspect(transform(esprima.parse(source, {
	comment: true,
	range: true,
	loc: true,
	tolerant: true,
	tokens: true
}), source), false, null));
