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
			tasks: "lint test"
		},
		jshint: {
			options: jshint,
			globals: jshint.predef
		},
		simplemocha: {
			all: {
				src: "test/*.js",
				options: {
					timeout: 500,
					ignoreLeaks: false,
					ui: "tdd",
					reporter: "spec"
				}
			},
			// To actually run code coverage, run:
			//	STYLEGURU_COVERAGE=1 grunt coverage | head -n -1 | tail -n +2 > coverage.html
			coverage: {
				src: "test/*.js",
				options: {
					timeout: 500,
					ignoreLeaks: false,
					ui: "tdd",
					reporter: "html-cov"
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-simple-mocha");

	// Default task.
	grunt.registerTask("default", "lint simplemocha:all");
	grunt.registerTask("test", "simplemocha:all");
	grunt.registerTask("coverage", "simplemocha:coverage");

};
