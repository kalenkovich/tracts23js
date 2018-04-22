// assume jsXMLParser has been imported

function getChild(DOMElement, name) {
	var elements_ =	DOMElement.getElementsByTagName(name);
	if (elements_.length <= 1) {
		return elements_.item(0);
	} else {
		console.log('Found ' + elements_.length + ' elements with the name ' + 'name');
		return undefined;
	}
}

function getAttributes(DOMElement, names, parseFun) {
	result = {};
	for (var i = 0; i < names.length; i++) {
		name = names[i];
		result[name] = parseFun(DOMElement.getAttribute(name));
	}
	return result
}

function getXYZ(DOMElement) {
	names = ['x', 'y', 'z'];
	struct = getAttributes(DOMElement, names, parseFloat);
	return [struct.x, struct.y, struct.z];
}