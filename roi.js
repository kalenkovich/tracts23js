function processROIs(scene, niiFiles, trk) {
	// scene - struct returned from processSceneFile
	// niiFiles - array of File objects
	// trk - struct returned from readTRKFile (.structs, .header) 
	//
	// Returns a struct with the following attributes:
	// flags - which ROIs we could process (bool array)
	// masks - array of ROI masks. Each mask is a bool array that tells which tracks go through a ROI
	var flags = [];
	var	masks = [];
	var	ROIDOMElement, processed;

	function processROI(ROIDOMElement) {
		var flag, mask;
			
		function getHandDrawMask() {
			return [];
		}
		
		function getSphereMask() {
			var center = getAttributes(
				getChild(ROIDOMElement, 'Center'),
				['x', 'y', 'z'], parseFloat);
			var radius = parseFloat(
				getChild(ROIDOMElement, 'Radius').getAttribute('Value'));
			
			/*
			offset=(-2, -2, 0)
			center = extract_xyz_attributes(roi.center) # in voxels and LPS
			center[:2] = dimensions[:2] - center[:2] + 1 # in voxel and RAS
			center += offset
			center += 0.5
			center = np.multiply(center, voxel_size) # in mm and RAS
			r = float(roi.radius['value']) * voxel_size[0] # Что делать, если воксели не кубические?
			roi_mask = [np.any(np.linalg.norm(line - center, axis=1) <= r) for line in streamlines]
			*/
		};
		
		
		flag = true;
		var ROI_type = ROIDOMElement.getAttribute("type").toString();
		switch (ROI_type) {
			case "HandDraw":
				mask = getHandDrawMask();
				break;
				
			case "Sphere":
				mask = getSphereMask();
				break;
				
			default:
				console.log('Not yet able to process ROIs of type ' + ROI_type);
				flag = false;
				mask = [];
		}
		
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
