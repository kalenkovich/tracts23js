// Binary file reading
importScripts("js-struct.js");

function readTRKFile() {
	var reader = new FileReaderSync();
	buffer = reader.readAsArrayBuffer(trkFile);
	
	header = readHeader(buffer);
	tracks = readTracks(buffer, header);
	
	return {"tracks": tracks, "header": header};
}

function readHeader(buffer) {
	
		
	var headerStruct = Struct.create(
		Struct.string("id_string", 6),
		Struct.array("dim", Struct.int16(), 3),
		Struct.array("voxel_size", Struct.float32(), 3),
		Struct.array("origin", Struct.float32(), 3),
		Struct.int16("n_scalars"),
		Struct.array("scalar_name", Struct.string(undefined, 20), 10),
		Struct.int16("n_properties"),
		Struct.array("property_name", Struct.string('', 20), 10),
		Struct.array("vox_to_ras", Struct.float32(), 16),
		Struct.string("reserved", 444),
		Struct.string("voxel_order", 4),
		Struct.string("pad2", 4),
		Struct.array("image_orientation_patient", Struct.float32(), 6),
		Struct.string("pad1", 2),
		Struct.uint8("invert_x"),
		Struct.uint8("invert_y"),
		Struct.uint8("invert_z"),
		Struct.uint8("swap_xy"),
		Struct.uint8("swap_yz"),
		Struct.uint8("swap_zx"),
		Struct.int32("n_count"),
		Struct.int32("version"),
		Struct.int32("hdr_size")
	);
		
	var header = headerStruct.readStructs(buffer, 0, 1)[0];
	return header;
}

function readTracks(buffer, header) {
	
	// n_count - Number of tracks stored in this track file. 0 means the number was NOT stored.
	// n_properties - Number of properties saved at each track.
	// hdr_size - Size of the header. Used to determine byte swap. Should be 1000.
	// n_scalars - Number of scalars saved at each track point (besides x, y and z coordinates).
	var n_count = header.n_count;
	var n_properties = header.n_properties;
	var offset = header.hdr_size;
	var n_scalars = header.n_scalars;
	
	var reader = new FileReaderSync();
	buffer = reader.readAsArrayBuffer(trkFile);
	
	var numberOfPointsStruct = Struct.create(Struct.int32("m"));
	var propertiesStruct = Struct.create(
		Struct.array("properties", Struct.float32(), n_properties)
	);
	
	function read_a_track(buffer, offset) {
	
		
		var m = numberOfPointsStruct.readStructs(buffer, offset, 1)[0].m;
		offset += 4;
	
		var pointsStruct = Struct.create(
			Struct.array("points", Struct.float32(), (3 + n_scalars) * m)
		);
		var points = pointsStruct.readStructs(buffer, offset, 1)[0].points;
		offset += (3 + n_scalars) * m * 4;
	
		// Right now points are in one long array. Let's split them.
		var pointsMatrix = [];
		while (points.length) pointsMatrix.push(points.splice(0, 3 + n_scalars));
	
		var properties = propertiesStruct.readStructs(buffer, offset, 1)[0].properties;
		offset += n_properties * 4;
		
		var track = {"points": pointsMatrix, "properties": properties};
		
		return {"track": track, "offset": offset};
	}
	
	var tracks = [];
	while (offset < buffer.byteLength) {
		res = read_a_track(buffer, offset);
		tracks.push(res.track);
		offset = res.offset;
	}
	
	return tracks;
}