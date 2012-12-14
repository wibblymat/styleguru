"Comments do not currently pass, but string expression statements do";
"We're not testing Esprima here, but we need to be sure that we handle";
"all possible statement/expression types without crashing";
var a = 1;
var _ = 2;
var y;
var foo = $;
var bar = null, baz = true;
var quux = [];
quux = [1];
quux = [false, true, undefined, null];
var myObj = {
	"a": 0,
	b: -0.543,
	c: 0xFF,
	d: 2.054e2,
	e: 1.457E-02
};
a =(a + a) * (a + a);
foo = bar ? null : undefined;
foo = !bar || ~baz && 5;
quux %= 1 + 2 * (foo + bar) - ((foo >> 16) >>> +3) & -2 | 3 ^ 5 / foo++;

var x = 1;
x /= 5;
x *= 5;
x -= 5;
x %= 5;
x <<= a;
x >>= 1;
x >>>= 10;
x &= 15;
x |= 15;
x ^= 15;
x++;
++x;
--x;
x--;

if(x in y || x instanceof y)
{
	foo();
}

if(a === 1 && a == 2 || a != 3 && a !== true)
{
	foo = false;
}

function moo(a)
{
	var flip = "foo".match(/oo/i);
	return a <= 4 && a >= 5;
}

var moof = function(a)
{
	return a < 4 && a > 5;
};

var cow = function(name, date)
{
	return "Moo! " + name;
};

foo.push(cow("a", 1, x = 5, x++)[0]);

throw new Error("An error");

for(var i = 0; i < 10; i++)
{
	x = i;
	break;
}

(function(x)
{
	return x + 2;
})(1);

for(name in foo)
{
	x = 5;
	continue;
}

delete myObj.foo;
x = typeof x;
void 0;

var Class = function()
{
	this.dave = 10;
};

var object = new Class();

foo = object.dave;
foo = object["dave"];
foo = quux[0];

for(var x = 0; x < 10; x++)
{
}

for(x = 0; x < 10; x++)
{
}

bar:
for(var name in quux)
{
	y++;
	break bar;
}

baz:
for(name in quux)
{
	x++;
	continue baz;
}

do
{
	x++;
}
while(x < 100);

while(false)
{
	x = 20;
}

function red()
{
	try
	{
		throw new Error();
	}
	catch(e)
	{
		throw e;
	}
	finally
	{
		x = 10;
	}
	return;
}

debugger;

with(moo)
{
	foo = bar;
}

switch(x)
{
	case 1:
		y = 1;
		break;
	case 2:
	case 3:
		y = 4;
	case 4:
		y = 5;
		break;
	default:
		y = 10;
}

for(x = 0, y = 1; false;)
{
}
