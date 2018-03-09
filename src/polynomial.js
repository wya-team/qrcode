import { QRMath } from './math';
// ---------------------------------------------------------------------
// QRPolynomial
// ---------------------------------------------------------------------

export const QRPolynomial = (num, shift) => {
	if (typeof num.length == 'undefined') {
		throw num.length + '/' + shift;
	}

	let offset = 0;
	while (offset < num.length && num[offset] == 0) {
		offset += 1;
	}
	let _num = new Array(num.length - offset + shift);
	for (let i = 0; i < num.length - offset; i += 1) {
		_num[i] = num[i + offset];
	}
	
	return {
		getAt(index) {
			return _num[index];
		},
		getLength() {
			return _num.length;
		},
		multiply(e) {
			let num = new Array(this.getLength() + e.getLength() - 1);
			for (let i = 0; i < this.getLength(); i += 1) {
				for (let j = 0; j < e.getLength(); j += 1) {
					num[i + j] ^= QRMath.gexp(QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j)));
				}
			}
			return QRPolynomial(num, 0);
		},
		mod(e) {
			if (this.getLength() - e.getLength() < 0) {
				return this;
			}
			let ratio = QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));
			let num = new Array(this.getLength());
			for (let i = 0; i < this.getLength(); i += 1) {
				num[i] = this.getAt(i);
			}
			for (let i = 0; i < e.getLength(); i += 1) {
				num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
			}
			// recursive call
			return QRPolynomial(num, 0).mod(e);
		}
	};
};