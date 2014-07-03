/**
 * Adapted the code in to order to run in a web worker. 
 * 
 * Original  author: Benjamin Hollis
 * parse_PHP author: José Manuel Barroso Galindo
 */

function htmlEncode(t) {
	return t != null ? t.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
}

function decorateWithSpan(value, className) {
	return '<span class="' + className + '">' + htmlEncode(value) + '</span>';
}

function valueToHTML(value) {
	var valueType = typeof value, output = "";
	if (value == null)
		output += decorateWithSpan("null", "type-null");
	else if (value && value.constructor == Array)
		output += arrayToHTML(value);
	else if (valueType == "object")
		output += objectToHTML(value);
	else if (valueType == "number")
		output += decorateWithSpan(value, "type-number");
	else if (valueType == "string")
		if (/^(http|https):\/\/[^\s]+$/.test(value))
			output += decorateWithSpan('"', "type-string") + '<a href="' + value + '">' + htmlEncode(value) + '</a>' + decorateWithSpan('"', "type-string");
		else
			output += decorateWithSpan('"' + value + '"', "type-string");
	else if (valueType == "boolean")
		output += decorateWithSpan(value, "type-boolean");

	return output;
}

function arrayToHTML(json) {
	var i, length, output = '<div class="collapser"></div>[<span class="ellipsis"></span><ul class="array collapsible">', hasContents = false;
	for (i = 0, length = json.length; i < length; i++) {
		hasContents = true;
		output += '<li><div class="hoverable">';
		output += valueToHTML(json[i]);
		if (i < length - 1)
			output += ',';
		output += '</div></li>';
	}
	output += '</ul>]';
	if (!hasContents)
		output = "[ ]";
	return output;
}

function objectToHTML(json) {
	var i, key, length, keys = Object.keys(json), output = '<div class="collapser"></div>{<span class="ellipsis"></span><ul class="obj collapsible">', hasContents = false;
	for (i = 0, length = keys.length; i < length; i++) {
		key = keys[i];
		hasContents = true;
		output += '<li><div class="hoverable">';
		output += '<span class="property">' + htmlEncode(key) + '</span>: ';
		output += valueToHTML(json[key]);
		if (i < length - 1)
			output += ',';
		output += '</div></li>';
	}
	output += '</ul>}';
	if (!hasContents)
		output = "{ }";
	return output;
}

function jsonToHTML(json, fnName) {
	var output = '';
	if (fnName)
		output += '<div class="callback-function">' + fnName + '(</div>';
	output += '<div id="json">';
	output += valueToHTML(json);
	output += '</div>';
	if (fnName)
		output += '<div class="callback-function">)</div>';
	return output;
}

function parse_PHP(input) {
	"use strict";
	var arrow1 = "=> ",
		arrow2 = "=&gt; ";
    var trim  = function(string) {
      return string.replace(/^\s+|\s+$/g, '');
    }
    var is_array = function(line) {
      return trim(line).indexOf("Array") !== -1 || trim(line).indexOf("Object") !== -1;
    }
    var is_beg_a = function(line) {
      return trim(line) == "(";
    }
    var is_end_a = function(line) {
      return trim(line) == ")";
    }
    var is_elmnt1 = function(line) {
      return line.match(/\[(.+?)\] =>/);
    }
    var is_elmnt2 = function(line) {
      return line.match(/\[(.+?)\] =&gt;/);
    }
    var is_elmnt = function(line) {
      return is_elmnt1(line) || is_elmnt2(line);
    }
    var get_elmnt_key   = function(line) {
      return line.match(/\[(.+?)\]/)[1];
    }
    var get_elmnt_value1 = function(line) {
      return line.slice(line.indexOf(arrow1) + arrow1.length);        
    }
    var get_elmnt_value2 = function(line) {
      return line.slice(line.indexOf(arrow2) + arrow2.length);        
    }
    var get_elmnt_value  = function(line) {
      return is_elmnt1(line) ? get_elmnt_value1(line) : get_elmnt_value2(line);
    }

    var parse_array = function(lines) {
        var ret = {}
        while (lines.length > 0) {
            var line = lines.shift();
            if (is_elmnt(line)) {
                var key = get_elmnt_key(line);
                if (is_array(line) && is_beg_a(lines[0])) {
                    var val  = {__parent: ret};
                    ret[key] = val;
                    ret      = val;
                } else {
                    ret[key] = get_elmnt_value(line);
                }

            } else if (is_end_a(line)) {
                if (ret.__parent) {
                    var temp = ret.__parent;
                    delete     ret.__parent;
                    ret = temp;
                } else {
                    break;
                }
            }
        }
        return ret;
    }

    var lines = trim(input).split("\n");
    var ret   = [];
    while (lines.length > 0) {
      var line = lines.shift();
      ret.push(is_array(line) ? parse_array(lines) : line);
    }
    return ret;
}

addEventListener("message", function(event) {
	var object;
	try {
		object = parse_PHP(event.data.json);
	} catch (e) {
		postMessage({
			error : true
		});
		return;
	}
	postMessage({
		onjsonToHTML : true,
		html : jsonToHTML(object, event.data.fnName)
	});
}, false);
