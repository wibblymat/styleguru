"use strict";
// Start with some "good" code
var sum = function(a, b)
{
	return a + b;
};

var addOne = sum.bind(null, 1);

var values = [1, 2, 3, 4, 5];

for(var i = 0; i < values.length; i++)
{
	// I'd probably do this with map if it wasn't an example
	if(values[i] % 2 === 0)
	{
		values[i] = addOne(values[i]);
	}
}


// And now some "bad" code
while(true){ i++; }

var multiply_two_numbers=function( a,b ) {
  return a*b;
};

foo = { a:1,b:2,c:3   }
;

var divide = function (a,b)
	{
// 	A comment with whitespace all wrong!
	return a/b   + ! c;
	}

  if ( divide( multiply_two_numbers( 1, 2 ), 2 )===1  && false)
{
	 console.log( "It's true!") ;
	 i++;
	 f = !i;
}

if(false) { console.log(1);
}

if(a==b) i++;

if(a!=b)
i/=2;

// My editor actually strips trailing whitespace so thats a hard test to have :s
