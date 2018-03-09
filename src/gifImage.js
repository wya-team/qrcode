import { byteArrayOutputStream } from './stream';

// ---------------------------------------------------------------------
// gifImage (B/W)
// ---------------------------------------------------------------------
let bitOutputStream = function (out) {
	let _out = out;
	let _bitLength = 0;
	let _bitBuffer = 0;
	
	return {
		write(data, length) {
			if ((data >>> length) != 0) {
				throw 'length over';
			}
			while (_bitLength + length >= 8) {
				_out.writeByte(0xff & ((data << _bitLength) | _bitBuffer));
				length -= (8 - _bitLength);
				data >>>= (8 - _bitLength);
				_bitBuffer = 0;
				_bitLength = 0;
			}
			_bitBuffer = (data << _bitLength) | _bitBuffer;
			_bitLength = _bitLength + length;
		},
		flush() {
			if (_bitLength > 0) {
				_out.writeByte(_bitBuffer);
			}
		}
	};
};
let getLZWRaster = (lzwMinCodeSize, _data) => {
	let clearCode = 1 << lzwMinCodeSize;
	let endCode = (1 << lzwMinCodeSize) + 1;
	let bitLength = lzwMinCodeSize + 1;
	// Setup LZWTable
	let table = lzwTable();
	for (let i = 0; i < clearCode; i += 1) {
		table.add(String.fromCharCode(i));
	}
	table.add(String.fromCharCode(clearCode));
	table.add(String.fromCharCode(endCode));
	let byteOut = byteArrayOutputStream();
	let bitOut = bitOutputStream(byteOut);
	// clear code
	bitOut.write(clearCode, bitLength);
	let dataIndex = 0;
	let s = String.fromCharCode(_data[dataIndex]);
	dataIndex += 1;
	while (dataIndex < _data.length) {
		let c = String.fromCharCode(_data[dataIndex]);
		dataIndex += 1;
		if (table.contains(s + c)) {
			s = s + c;
		}
		else {
			bitOut.write(table.indexOf(s), bitLength);
			if (table.size() < 0xfff) {
				if (table.size() == (1 << bitLength)) {
					bitLength += 1;
				}
				table.add(s + c);
			}
			s = c;
		}
	}
	bitOut.write(table.indexOf(s), bitLength);
	// end code
	bitOut.write(endCode, bitLength);
	bitOut.flush();
	return byteOut.toByteArray();
};

let lzwTable = () => {
	let _map = {};
	let _size = 0;
	
	return {
		add(key) {
			if (this.contains(key)) {
				throw 'dup key:' + key;
			}
			_map[key] = _size;
			_size += 1;
		},
		size() {
			return _size;
		},
		indexOf(key) {
			return _map[key];
		},
		contains(key) {
			return typeof _map[key] != 'undefined';
		},
	};
};
export const gifImage = function (width, height) {
	let _width = width;
	let _height = height;
	let _data = new Array(width * height);
	return {
		setPixel(x, y, pixel) {
			_data[y * _width + x] = pixel;
		},
		write(out) {
			// ---------------------------------
			// GIF Signature
			out.writeString('GIF87a');
			// ---------------------------------
			// Screen Descriptor
			out.writeShort(_width);
			out.writeShort(_height);
			out.writeByte(0x80); // 2bit
			out.writeByte(0);
			out.writeByte(0);
			// ---------------------------------
			// Global Color Map
			// black
			out.writeByte(0x00);
			out.writeByte(0x00);
			out.writeByte(0x00);
			// white
			out.writeByte(0xff);
			out.writeByte(0xff);
			out.writeByte(0xff);
			// ---------------------------------
			// Image Descriptor
			out.writeString(',');
			out.writeShort(0);
			out.writeShort(0);
			out.writeShort(_width);
			out.writeShort(_height);
			out.writeByte(0);
			// ---------------------------------
			// Local Color Map
			// ---------------------------------
			// Raster Data
			let lzwMinCodeSize = 2;
			let raster = getLZWRaster(lzwMinCodeSize, _data);
			out.writeByte(lzwMinCodeSize);
			let offset = 0;
			while (raster.length - offset > 255) {
				out.writeByte(255);
				out.writeBytes(raster, offset, 255);
				offset += 255;
			}
			out.writeByte(raster.length - offset);
			out.writeBytes(raster, offset, raster.length - offset);
			out.writeByte(0x00);
			// ---------------------------------
			// GIF Terminator
			out.writeString(';');
		}
	};
	return _this;
};