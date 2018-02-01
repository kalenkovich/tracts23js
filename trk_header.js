function readHeader(trkFile) {
	var reader = new FileReader();
	reader.onload = function (event) {
		var buffer = event.target.result;
		
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
		console.log(header);
	}
	reader.readAsArrayBuffer(trkFile);
}

function readTRK(trkFile) {
	var reader = new FileReader();
	reader.onload = function (event) {
		var buffer = event.target.result;
		var header = readHeader(buffer);
		var tracks = readTracks(buffer, header);
		return {header: header, tracks: tracks}
	}
	reader.readAsArrayBuffer(trkFile);
}