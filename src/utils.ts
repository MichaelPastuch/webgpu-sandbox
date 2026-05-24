import { TWO_PI } from "./constants";

export type TVec3 = [number, number, number];

/** Return function that applies a delta to a given value, wrapping a given range */
export function wrap(min: number, max: number) {
	return function (value: number, delta: number) {
		const newValue = value + delta;
		if (newValue > max) {
			return newValue - max;
		} else if (newValue < min) {
			return max + newValue;
		} else {
			return newValue;
		}
	}
}

export const wrapRadians = wrap(0, TWO_PI);

/** Return function that applies a delta to a given value, over/undeflowing back to min/max */
export function overflow(min: number, max: number) {
	return function (value: number, delta: number) {
		const newValue = value + delta;
		if (newValue > max) {
			return min;
		} else if (newValue < min) {
			return max;
		} else {
			return newValue;
		}
	}
}

/** Return function that applies a delta to a given value, clamping to given range */
export function clamp(min: number, max: number) {
	return function (value: number, delta: number) {
		const newValue = value + delta;
		if (newValue > max) {
			return max;
		} else if (newValue < min) {
			return min;
		} else {
			return newValue;
		}
	}
}

/** Create vector combining lhs and rhs */
export function add(lhs: TVec3, rhs: TVec3): TVec3 {
	return [lhs[0] + rhs[0], lhs[1] + rhs[1], lhs[2] + rhs[2]];
}

export function mul(vec: TVec3, mul: number): TVec3 {
	return [vec[0] * mul, vec[1] * mul, vec[2] * mul];
}

/** Vector length */
export function magnitude(vec: TVec3) {
	return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}

export function normalize(vec: TVec3): TVec3 {
	const mag = magnitude(vec);
	return [vec[0] / mag, vec[1] / mag, vec[2] / mag];
}

export class RollingAverage {

	private valIdx: number = 0;
	private readonly vals: number[];
	private readonly scalar: number;

	public get average(): number {
		return this.scalar * this.vals
			.reduce((acc, value) => acc + value, 0);
	}

	constructor(private readonly numSamples: number) {
		this.scalar = 1 / numSamples;
		this.vals = new Array(numSamples).map(() => 0);
	}

	update(newSample: number) {
		// Wrap sample slot
		this.valIdx++;
		if (this.valIdx === this.numSamples) {
			this.valIdx = 0;
		}
		this.vals[this.valIdx] = newSample;
	}

}
