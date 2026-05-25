import { TWO_PI } from "./constants";

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
