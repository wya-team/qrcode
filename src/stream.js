// ---------------------------------------------------------------------
// base64DecodeInputStream
// ---------------------------------------------------------------------
const decode = (c) => {
	if (0x41 <= c && c <= 0x5a) {
		return c - 0x41;
	}
	else if (0x61 <= c && c <= 0x7a) {
		return c - 0x61 + 26;
	}
	else if (0x30 <= c && c <= 0x39) {
		return c - 0x30 + 52;
	}
	else if (c == 0x2b) {
		return 62;
	}
	else if (c == 0x2f) {
		return 63;
	}
	else {
		throw 'c:' + c;
	}
};
let encode = (n) => {
	if (n < 0) {
		// error.
	}
	else if (n < 26) {
		return 0x41 + n;
	}
	else if (n < 52) {
		return 0x61 + (n - 26);
	}
	else if (n < 62) {
		return 0x30 + (n - 52);
	}
	else if (n == 62) {
		return 0x2b;
	}
	else if (n == 63) {
		return 0x2f;
	}
	throw 'n:' + n;
};

// =====================================================================
// GIF Support etc.
//
// ---------------------------------------------------------------------
// byteArrayOutputStream
// ---------------------------------------------------------------------
export const byteArrayOutputStream = () => {
	let _bytes = [];
	return {
		writeByte(b) {
			return _bytes.push(b & 0xff);
		},
		writeShort(i) {
			this.writeByte(i);
			this.writeByte(i >>> 8);
		},
		writeBytes (b, off, len) {
			off = off || 0;
			len = len || b.length;
			for (let i = 0; i < len; i += 1) {
				this.writeByte(b[i + off]);
			}
		},
		writeString(s) {
			for (let i = 0; i < s.length; i += 1) {
				this.writeByte(s.charCodeAt(i));
			}
		},
		toByteArray() {
			return _bytes;
		},
		toString() {
			let s = '';
			s += '[';
			for (let i = 0; i < _bytes.length; i += 1) {
				if (i > 0) {
					s += ',';
				}
				s += _bytes[i];
			}
			s += ']';
			return s;
		}
	};
};

// ---------------------------------------------------------------------
// base64EncodeOutputStream
// ---------------------------------------------------------------------
export const base64EncodeOutputStream = function () {
	let _buffer = 0;
	let _buflen = 0;
	let _length = 0;
	let _base64 = '';
	let writeEncoded =  b => _base64 += String.fromCharCode(encode(b & 0x3f));
	return {
		writeByte (n) { 
			_buffer = (_buffer << 8) | (n & 0xff);
			_buflen += 8;
			_length += 1;
			while (_buflen >= 6) {
				writeEncoded(_buffer >>> (_buflen - 6));
				_buflen -= 6;
			}
		},
		flush () { 
			if (_buflen > 0) {
				writeEncoded(_buffer << (6 - _buflen));
				_buffer = 0;
				_buflen = 0;
			}
			if (_length % 3 != 0) {
				// padding
				let padlen = 3 - _length % 3;
				for (let i = 0; i < padlen; i += 1) {
					_base64 += '=';
				}
			}
		},
		toString () { 
			return _base64;
		}
	};
};

export const base64DecodeInputStream = (str) => {
	let _str = str;
	let _pos = 0;
	let _buffer = 0;
	let _buflen = 0;
	return {
		read () {
			while (_buflen < 8) {
				if (_pos >= _str.length) {
					if (_buflen == 0) {
						return -1;
					}
					throw 'unexpected end of file./' + _buflen;
				}
				let c = _str.charAt(_pos);
				_pos += 1;
				if (c == '=') {
					_buflen = 0;
					return -1;
				}
				else if (c.match(/^\s$/)) {
					// ignore if whitespace.
					continue;
				}
				_buffer = (_buffer << 6) | decode(c.charCodeAt(0));
				_buflen += 6;
			}
			let n = (_buffer >>> (_buflen - 8)) & 0xff;
			_buflen -= 8;
			return n;
		}
	};
};
