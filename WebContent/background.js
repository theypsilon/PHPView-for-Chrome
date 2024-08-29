var path, value, copyPathMenuEntryId, copyValueMenuEntryId;

function getDefaultTheme(callback) {
	fetch(chrome.runtime.getURL('jsonview.css'))
		.then(response => response.text())
		.then(function(responseText) {
			callback(responseText);
		})
		.catch(function(e) {
			console.error('PHPViewExtensions error fetching the custom theme.', e);
			callback("");
		})
}

function storeGet(key, cb) {
	return chrome.storage.local.get(key, cb);
}

function storeSet(kv, cb) {
	return chrome.storage.local.set(kv, cb);
}

function setCopy(tab, value) {
	chrome.tabs.sendMessage(tab.id, {
		writeToClipboard: value
	}, function(_response) {});
}

function refreshMenuEntry(port) {
	storeGet(['options'], function(data) {
		const options = data.options ? data.options : {};
		if (options.addContextMenu && !copyPathMenuEntryId) {
			copyPathMenuEntryId = chrome.contextMenus.create({
				title : "Copy path",
				id : "copy-path",
				contexts : [ "page", "link", "selection" ],
			});
			copyValueMenuEntryId = chrome.contextMenus.create({
				title : "Copy value",
				id : "copy-value",
				contexts : [ "page", "link", "selection" ],
			});
			chrome.contextMenus.onClicked.addListener((info, tab) => {
				if (!info.menuItemId) {
					return;
				}
				switch (info.menuItemId) {
					case 'copy-path': setCopy(tab, path); break;
					case 'copy-value': setCopy(tab, value); break;
				}
			})
		}
		if (!options.addContextMenu && copyPathMenuEntryId) {
			chrome.contextMenus.remove(copyPathMenuEntryId);
			chrome.contextMenus.remove(copyValueMenuEntryId);
			copyPathMenuEntryId = null;
		}
	});
}

function onWorkerJSONLintMessage(port, response) {
	if (response?.workerMessage?.error) {
		port.postMessage({
			ongetError : true,
			error : response.workerMessage.error,
			loc : response.workerMessage.loc,
			offset : msg.offset
		});
	}
}

function onWorkerFormatterMessage(port, response) {
	const message = response.workerMessage;
	if (message.html) {
		storeGet(['theme'], function(data) {
			port.postMessage({
				onjsonToHTML : true,
				html : message.html,
				theme : data.theme,
				jsonObject : message.jsonObject
			});
		})
	}
	if (message.error) {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (!tabs[0]) { 
				return;
			}
			chrome.tabs.sendMessage(tabs[0].id, {
				action: 'workerJSONLintMessage',
				json: msg.json,
			}, function (response) {
				onWorkerJSONLintMessage(port, response)
			});
		});
	}
}

function init() {
	chrome.runtime.onConnect.addListener(function(port) {
		port.onMessage.addListener(function(msg) {
			if (msg.init) {
				storeGet(['options'], function(data) {
					port.postMessage({
						oninit : true,
						options : data.options ? data.options : {}
					});
				});
			}
			if (msg.copyPropertyPath) {
				path = msg.path;
				value = msg.value;
			}
			if (msg.jsonToHTML) {
				chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
					if (!tabs[0]) { 
						return;
					}
					chrome.tabs.sendMessage(tabs[0].id, {
						action: 'workerFormatterMessage',
						json: msg.json,
					}, function (response) {
						onWorkerFormatterMessage(port, response)
					});
				});
			}
		});
		refreshMenuEntry(port);
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.phpViewRefreshMenuEntry) {
				refreshMenuEntry(port)
			}
			sendResponse(true);
		});
	});
}

storeGet(['options', 'theme'], function(data) {
	const options = data.options ? data.options : {};
	let setOptions = false;
	if (typeof options.addContextMenu == "undefined") {
		options.addContextMenu = false;
		setOptions = true;
	}
	if (typeof data.theme !== 'string') {
		getDefaultTheme(function (defaultTheme) {
		  storeSet({ options, theme: defaultTheme }, function () {
			init();
		  });
		});
	} else if (setOptions) {
		storeSet({ options }, function () {
			init();
		});
	} else {
		init();
	}
})
