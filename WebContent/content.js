var port = chrome.runtime.connect(), collapsers, options, jsonSelector;
let content

function displayError(error, loc, offset) {
	const link = document.createElement("link");
	const pre = document.body.firstChild.firstChild;
	const text = pre.textContent.substring(offset);
	const start = 0;
	const ranges = [];
	const idx = 0;
	let end, range = document.createRange();
	const imgError = document.createElement("img");
	content = document.createElement("div");
	const errorPosition = document.createElement("span");
	const container = document.createElement("div");
	const closeButton = document.createElement("div");;
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = chrome.runtime.getURL("content_error.css");
	document.head.appendChild(link);
	while (idx != -1) {
		idx = text.indexOf("\n", start);
		ranges.push(start);
		start = idx + 1;
	}
	start = ranges[loc.first_line - 1] + loc.first_column + offset;
	end = ranges[loc.last_line - 1] + loc.last_column + offset;
	range.setStart(pre, start);
	if (start == end - 1)
		range.setEnd(pre, start);
	else
		range.setEnd(pre, end);
	errorPosition.className = "error-position";
	errorPosition.id = "error-position";
	range.surroundContents(errorPosition);
	imgError.src = chrome.runtime.getURL("error.gif");
	errorPosition.insertBefore(imgError, errorPosition.firstChild);
	content.className = "content";
	closeButton.className = "close-error";
	closeButton.onclick = function() {
		content.parentElement.removeChild(content);
	};
	content.textContent = error;
	content.appendChild(closeButton);
	container.className = "container";
	container.appendChild(content);
	errorPosition.parentNode.insertBefore(container, errorPosition.nextSibling);
	location.hash = "error-position";
	history.replaceState({}, "", "#");
}

function displayUI(theme, html, jsonObject) {
	var statusElement, toolboxElement, expandElement, reduceElement, viewSourceElement, optionsElement, userStyleElement, baseStyleElement;
	content += '<link rel="stylesheet" type="text/css" href="' + chrome.runtime.getURL("jsonview-core.css") + '">';
	baseStyleElement = document.createElement("link");
	content += "<style>" + theme + "</style>";
	baseStyleElement.rel = "stylesheet";
	content += html;
	baseStyleElement.type = "text/css";
	document.body.innerHTML = content;
	baseStyleElement.href = chrome.runtime.getURL("jsonview-core.css");
	document.head.appendChild(baseStyleElement);
	userStyleElement = document.createElement("style");
	userStyleElement.appendChild(document.createTextNode(theme));
	document.head.appendChild(userStyleElement);
	document.body.innerHTML = html;
	collapsers = document.querySelectorAll("#json .collapsible .collapsible");
	statusElement = document.createElement("div");
	statusElement.className = "status";
	copyPathElement = document.createElement("div");
	copyPathElement.className = "copy-path";
	statusElement.appendChild(copyPathElement);
	document.body.appendChild(statusElement);
	toolboxElement = document.createElement("div");
	toolboxElement.className = "toolbox";
	expandElement = document.createElement("span");
	expandElement.title = "expand all";
	expandElement.innerText = "+";
	reduceElement = document.createElement("span");
	reduceElement.title = "reduce all";
	reduceElement.innerText = "-";
	viewSourceElement = document.createElement("a");
	viewSourceElement.innerText = "View source";
	viewSourceElement.target = "_blank";
	viewSourceElement.href = "view-source:" + location.href;
	optionsElement = document.createElement("img");
	optionsElement.title = "options";
	optionsElement.src = chrome.runtime.getURL("options.png");
	toolboxElement.appendChild(expandElement);
	toolboxElement.appendChild(reduceElement);
	toolboxElement.appendChild(viewSourceElement);
	toolboxElement.appendChild(optionsElement);
	document.body.appendChild(toolboxElement);
	document.body.addEventListener('click', ontoggle, false);
	document.body.addEventListener('mouseover', onmouseMove, false);
	document.body.addEventListener('click', onmouseClick, false);
	document.body.addEventListener('contextmenu', (event) => onContextMenu(event, jsonObject), false);
	expandElement.addEventListener('click', onexpand, false);
	reduceElement.addEventListener('click', onreduce, false);
	optionsElement.addEventListener("click", function() {
		window.open(chrome.runtime.getURL("options.html"));
	}, false);
	copyPathElement.addEventListener("click", function(event) {
		if (event.isTrusted === false)
			return;

		port.postMessage({
			copyPropertyPath : true,
			path : statusElement.innerText
		});
	}, false);
}

function extractData(rawText) {
	var tokens, text = rawText.trim();

	function test(text) {
		var pre = text.indexOf("<pre>");
	    var arr = text.indexOf("Array\n(" );
		var obj = text.indexOf("Object\n(");
		return arr === 0 || obj === 0 || (pre < 10 && (arr !== -1 || obj !== -1));
	}

	if (test(text)) {
		var offset = text.indexOf("<pre>");
		return {
			text : rawText,
			offset : offset !== -1 ? offset : 0
		};
	}
	tokens = text.match(/^([^\s\(]*)\s*\(([\s\S]*)\)\s*;?$/);
	if (tokens && tokens[1] && tokens[2]) {
		if (test(tokens[2].trim()))
			return {
				fnName : tokens[1],
				text : tokens[2],
				offset : rawText.indexOf(tokens[2])
			};
	}
}

function processData(data) {

	var xhr, jsonText;
	
	function formatToHTML(fnName, offset) {
		if (!jsonText)
			return;

		port.postMessage({
			jsonToHTML : true,
			json : jsonText,
			fnName : fnName,
			offset : offset
		});
	}

	if (window == top || options.injectInFrame)
		if (options.safeMethod) {
			fetch(document.location.href)
				.then(response => response.text())
				.then(responseText => {
					const data = extractData(responseText);
					if (data) {
						jsonText = data.text;
						formatToHTML(data.fnName, data.offset);
					}
				})
				.catch(fetchError => {
					console.error('Unsafe request not working well on PHPView, please disable it.', fetchError)
				});
		} else if (data) {
			jsonText = data.text;
			formatToHTML(data.fnName, data.offset);
		}
}

function ontoggle(event) {
	var collapsed, target = event.target;
	if (event.target.className == 'collapser') {
		collapsed = target.parentNode.getElementsByClassName('collapsible')[0];
		if (collapsed.parentNode.classList.contains("collapsed"))
			collapsed.parentNode.classList.remove("collapsed");
		else
			collapsed.parentNode.classList.add("collapsed");
	}
}

function onexpand() {
	Array.prototype.forEach.call(collapsers, function(collapsed) {
		if (collapsed.parentNode.classList.contains("collapsed"))
			collapsed.parentNode.classList.remove("collapsed");
	});
}

function onreduce() {
	Array.prototype.forEach.call(collapsers, function(collapsed) {
		if (!collapsed.parentNode.classList.contains("collapsed"))
			collapsed.parentNode.classList.add("collapsed");
	});
}

function getParentLI(element) {
	if (element.tagName != "LI")
		while (element && element.tagName != "LI")
			element = element.parentNode;
	if (element && element.tagName == "LI")
		return element;
}

var onmouseMove = (function() {
	var hoveredLI;

	function onmouseOut() {
		var statusElement = document.querySelector(".status");
		if (hoveredLI) {
			hoveredLI.firstChild.classList.remove("hovered");
			hoveredLI = null;
			statusElement.innerText = "";
			jsonSelector = [];
		}
	}

	return function(event) {
		if (event.isTrusted === false)
			return;
		var str = "", statusElement = document.querySelector(".status");
		element = getParentLI(event.target);
		if (element) {
			jsonSelector = [];
			if (hoveredLI)
				hoveredLI.firstChild.classList.remove("hovered");
			hoveredLI = element;
			element.firstChild.classList.add("hovered");
			do {
				if (element.parentNode.classList.contains("array")) {
					var index = [].indexOf.call(element.parentNode.children, element);
					str = "[" + index + "]" + str;
					jsonSelector.unshift(index);
				}
				if (element.parentNode.classList.contains("obj")) {
					var key = element.firstChild.firstChild.innerText;
					str = "." + key + str;
					jsonSelector.unshift(key);
				}
				element = element.parentNode.parentNode.parentNode;
			} while (element.tagName == "LI");
			if (str.charAt(0) == '.')
				str = str.substring(1);
			statusElement.innerText = str;
			return;
		}
		onmouseOut();
	};
})();

var selectedLI;

function onmouseClick() {
	if (selectedLI)
		selectedLI.firstChild.classList.remove("selected");
	selectedLI = getParentLI(event.target);
	if (selectedLI) {
		selectedLI.firstChild.classList.add("selected");
	}
}

function onContextMenu(event, jsonObject) {
	var currentLI, statusElement, selection = "", i, value;
	currentLI = getParentLI(event.target);
	statusElement = document.querySelector(".status");
	if (currentLI) {

		var value = jsonObject;
		jsonSelector.forEach(function(idx) {
			value = value[idx];
		});

		port.postMessage({
			copyPropertyPath : true,
			path : statusElement.innerText,
			value : typeof value == "object" ? JSON.stringify(value) : value
		});
	}
}

function init(data) {
	port.onMessage.addListener(function(msg) {
		if (msg.oninit) {
			options = msg.options;
			processData(data);
		}
		if (msg.onjsonToHTML)
			if (msg.html) {
				displayUI(msg.theme, msg.html, msg.jsonObject);
			} else if (msg.json)
				port.postMessage({
					getError : true,
					json : msg.json,
					fnName : data.fnName
				});
		if (msg.ongetError) {
			displayError(msg.error, msg.loc, msg.offset);
		}
	});
	port.postMessage({
		init : true
	});
}

function load() {
	var child, data;
	if (document.body.innerHTML.indexOf("Array\n(" ) !== -1 ||
		document.body.innerHTML.indexOf("Object\n(") !== -1
	) {
		data = extractData(document.body.innerHTML);
		if (data) {
			init(data);
		}
	}
}

load();

function startWorker(message, sendResponse, filename) {
	fetch(chrome.runtime.getURL(filename))
		.then(fetchResponse => fetchResponse.text())
		.then(function (scriptText) {
			const blob = new Blob([scriptText], { type: 'application/javascript' });
			return URL.createObjectURL(blob);
		})
		.then(workerUrl => {
			const worker = new Worker(workerUrl);

			worker.addEventListener('message', (event) => {
				sendResponse({ workerMessage: event.data });
				worker.terminate();
			});

			worker.postMessage({
				json: message.json,
			});
		})
		.catch(fetchError => {
			console.error('Error fetching worker script on PHPView:', fetchError)
		});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'workerFormatterMessage') {
		startWorker(message, sendResponse, 'workerFormatter.js')
    } else if (message.action === 'workerJSONLintMessage') {
		startWorker(message, sendResponse, 'workerJSONLint.js')
    }
	return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.writeToClipboard) {
		navigator.clipboard.writeText(message.writeToClipboard)
			.then(() => sendResponse())
			.catch(_e => {});
	}
});
