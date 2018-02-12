function processROIs(scene, niiFiles, trk) {
	// Returns a struct with the following attributes:
	// flags - which ROIs we could process (bool array)
	// masks - array of ROI masks. Each mask is a bool array that tells which tracks go through a ROI
	var flags, masks, ROIDOMElement, processed;

	function processROI(ROIDOMElement) {
		var flag, mask;
			
		function getHandDrawMask() {
			
		}
		
		
		
		flag = true;
		var ROI_type = ROIDOMElement.getAttribute("type");
		switch (ROI_type) {
			case "HandDraw":
				mask = getHandDrawMask();
				break;
				
			case "Sphere":
				mask = getSphereMask();
				break;
				
			default:
				flag = false;
				mask = [];
		}
		
		if (ROI_type == "HandDraw") {
			
		} else if (ROI_type
		
		return {"flag": flag, "mask": mask};
	}
	
	for (var i = 0, numROIs = scene.ROIsXML.length; i < numROIs; i++) {
		ROIDOMElement = scene.ROIsXML.item(i);
		processed = processROI(ROIDOMElement);
		flags.push(processed.flag);
		masks.push(processed.mask);
	};
	
	return {"flags": flags, "masks": masks}
};
