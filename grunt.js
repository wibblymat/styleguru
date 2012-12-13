/*global module:false*/
"use strict";
module.exports = function(grunt) {

	var jshint = "<json:.jshintrc>";

	// Project configuration.
	grunt.initConfig({
		pkg: "<json:package.json>",
		lint: {
			// Be careful not include the test fixtures in here
			// They definitely don't pass linting!
			files: ["grunt.js", "lib/**/*.js", "test/*.js"]
		},
		watch: {
			files: "<config:lint.files>",
			tasks: "lint simplemocha"
		},
		jshint: {
			options: jshint,
			globals: jshint.predef
		},
		simplemocha: {
			all: {
				src: "test/*.js",
				options: {
					timeout: 3000,
					ignoreLeaks: false,
					ui: "tdd",
					reporter: "spec"
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-simple-mocha");

	// Default task.
	grunt.registerTask("default", "lint simplemocha");

};
