// XML parsing in web worker
importScripts("jsXMLParser/compressed/tinyxmlw3cdom.js");
importScripts("jsXMLParser/compressed/tinyxmlsax.js");

// Read .trk file
importScripts("trk.js");

importScripts("roi.js");


function findFiles(files, fun) {
	found = [];
	for (var i = 0, numFiles = files.length; i < numFiles; i++) {
	  if (fun(files[i])) found.push(files[i]);
	}
	return found;
};
			
function findFileByName(files, fileName) {
	return findFiles(files, 
					 function (file) { return file.name == fileName})[0];
};

function findFilesWithExtension(files, extension) {
	return findFiles(files, 
	    function (file) { 
			return file.name.endsWith(extension)
		}
	);
};


function processSceneFile(sceneFile) {
	
	var reader = new FileReaderSync();
	var sceneXMLString = reader.readAsText(sceneFile);
	
	// Remove the comment part, leave only the content of the <Scene> tag
	var start = sceneXMLString.indexOf('<Scene');
	var endSubstring = '/Scene>';
	var end = sceneXMLString.indexOf(endSubstring) + endSubstring.length;
	sceneXMLString = sceneXMLString.substring(start, end);
	
	// There is an invalid tag with the # sign in it
	sceneXMLString = sceneXMLString.replace(/#/g, "__hash__");
	
	var parser = new DOMImplementation();
	var xmlScene = parser.loadXML(sceneXMLString);

	
	tractsXML = xmlScene.getElementsByTagName('Track');
	ROIsXML = xmlScene.getElementsByTagName('ROI');
	
	function get_xyz(element) {
		var x, y, z;
		x = element.getAttribute('x');
		y = element.getAttribute('y');
		z = element.getAttribute('y');
		return {'x': x, 'y': y, 'z': z}
	};
	
	var dimensionsDOMElement = xmlScene.getElementsByTagName('Dimension').item(0);
	var dimensions = get_xyz(dimensionsDOMElement);
	
	voxelSizeDOMElement = xmlScene.getElementsByTagName('VoxelSize').item(0);
	var voxelSize = get_xyz(voxelSizeDOMElement);
	
	voxelOrderDOMElement = xmlScene.getElementsByTagName('VoxelOrder').item(0);
	currentVoxelOrder = voxelOrderDOMElement.getAttribute("current");
	originalVoxelOrder = voxelOrderDOMElement.getAttribute("original");
	
	// Find TrackFile
	var trackFileElement = xmlScene.getElementsByTagName('TrackFile').item(0);
	var trackFileName = trackFileElement.getAttribute('rpath');
	
	return {"trackFileName": trackFileName, 
			"ROIsXML": ROIsXML, 
			"tractsXML": tractsXML,
			"dimensions": dimensions,
			"voxelSize": voxelSize,
			"currentVoxelOrder": currentVoxelOrder,
			"originalVoxelOrder": originalVoxelOrder};
	
};

			
onmessage = function(e) {
  
	console.log('tkr_reader worker started working');

	var files = e.data;

	sceneFile = findFilesWithExtension(files, '.scene')[0];
	var scene = processSceneFile(sceneFile);
	
	trkFile = findFileByName(files, scene.trackFileName);
	var trk = readTRKFile(trkFile);
	
	niiFiles = findFilesWithExtension(files, '.nii');
	ROIs = processROIs(scene, niiFiles, trk);
	tracts = processTracts(scene, ROIs);
	
	console.log(sceneFile.name);


	postMessage("hello");
}