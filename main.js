var browse = document.querySelector("#browse");

if (window.Worker) { // Check if Browser supports the Worker api.
	
	var trk_reader = new Worker("trk_reader.js");
	
	browse.onchange = function(e) {
		var files = e.target.files;
		trk_reader.postMessage(files);
	};
	
	function renderTrackVisScene() {
		console.log("Every day I'm rendering, rendering");
	};
	trk_reader.onmessage = renderTrackVisScene;
	
	
}