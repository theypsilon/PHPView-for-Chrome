function initOptions() {
	storeGet(['options'], function (data) {
		const options = data.options ? data.options : {};
		const safeMethodInput = document.getElementById("safeMethodInput")
		const injectInFrameInput = document.getElementById("injectInFrameInput")
		const addContextMenuInput = document.getElementById("addContextMenuInput");
		safeMethodInput.checked = options.safeMethod;
		injectInFrameInput.checked = options.injectInFrame;
		addContextMenuInput.checked = options.addContextMenu;
		safeMethodInput.addEventListener("change", function() {
			options.safeMethod = safeMethodInput.checked;
			storeSet({options}, function() {})
		});
		injectInFrameInput.addEventListener("change", function() {
			options.injectInFrame = injectInFrameInput.checked;
			storeSet({options}, function() {})
		});
		addContextMenuInput.addEventListener("change", function() {
			options.addContextMenu = addContextMenuInput.checked;
			storeSet({options}, function() {
				chrome.runtime.sendMessage({phpViewRefreshMenuEntry: true}, function() {});
			})
		});
		document.getElementById("open-editor").addEventListener("click", function() {
			location.href = "csseditor.html";
		}, false);
	})
}

function storeGet(key, cb) {
	return chrome.storage.local.get(key, cb);
}

function storeSet(kv, cb) {
	return chrome.storage.local.set(kv, cb);
}

addEventListener("load", initOptions, false);
