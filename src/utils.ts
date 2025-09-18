import { PI_EPSILON, TWO_PI } from "./constants";

export type TVec3 = [number, number, number];

export type TQuat = [number, number, number, number];

/**
 * NOTE
 * WebGPU stores matrix values by columns, as opposed to by rows
 * | 0 | 4 | 8 |12 |
 * | 1 | 5 | 9 |13 |
 * | 2 | 6 |10 |14 |
 * | 3 | 7 |11 |15 |
 */

export type TMatrix3 = [
	number, number, number,
	number, number, number,
	number, number, number
];

export type TMatrix4 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

export const identity: TMatrix4 = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
];

/** Apply delta to a given angle and wrap in the range 0 <= angle <= 2Pi */
export function wrapRadians(angle: number, delta: number) {
	const newRadians = angle + delta;
	if (newRadians > TWO_PI) {
		return newRadians - TWO_PI;
	} else if (newRadians < 0) {
		return TWO_PI + newRadians;
	} else {
		return newRadians;
	}
}

/** Apply delta to a given angle and clamp in the range 0 < angle < Pi */
export function clampRadians(angle: number, delta: number) {
	const newRadians = angle + delta;
	if (newRadians > PI_EPSILON) {
		return PI_EPSILON;
	} else if (newRadians < Number.EPSILON) {
		return Number.EPSILON;
	} else {
		return newRadians;
	}
}

export function matrixMultiply3(lhs: TMatrix3, rhs: TMatrix3): TMatrix3 {
	return [
		// Col 1
		lhs[0] * rhs[0] + lhs[3] * rhs[1] + lhs[6] * rhs[2],
		lhs[1] * rhs[0] + lhs[4] * rhs[1] + lhs[7] * rhs[2],
		lhs[2] * rhs[0] + lhs[5] * rhs[1] + lhs[8] * rhs[2],
		// Col 2
		lhs[0] * rhs[3] + lhs[3] * rhs[4] + lhs[6] * rhs[5],
		lhs[1] * rhs[3] + lhs[4] * rhs[4] + lhs[7] * rhs[5],
		lhs[2] * rhs[3] + lhs[5] * rhs[4] + lhs[8] * rhs[5],
		// Col 3
		lhs[0] * rhs[6] + lhs[3] * rhs[7] + lhs[6] * rhs[8],
		lhs[1] * rhs[6] + lhs[4] * rhs[7] + lhs[7] * rhs[8],
		lhs[2] * rhs[6] + lhs[5] * rhs[7] + lhs[8] * rhs[8]
	];
}

export function matrixMultiply4(lhs: TMatrix4, rhs: TMatrix4): TMatrix4 {
	return [
		// Col 1
		lhs[0] * rhs[0] + lhs[4] * rhs[1] + lhs[8] * rhs[2] + lhs[12] * rhs[3],
		lhs[1] * rhs[0] + lhs[5] * rhs[1] + lhs[9] * rhs[2] + lhs[13] * rhs[3],
		lhs[2] * rhs[0] + lhs[6] * rhs[1] + lhs[10] * rhs[2] + lhs[14] * rhs[3],
		lhs[3] * rhs[0] + lhs[7] * rhs[1] + lhs[11] * rhs[2] + lhs[15] * rhs[3],
		// Col 2
		lhs[0] * rhs[4] + lhs[4] * rhs[5] + lhs[8] * rhs[6] + lhs[12] * rhs[7],
		lhs[1] * rhs[4] + lhs[5] * rhs[5] + lhs[9] * rhs[6] + lhs[13] * rhs[7],
		lhs[2] * rhs[4] + lhs[6] * rhs[5] + lhs[10] * rhs[6] + lhs[14] * rhs[7],
		lhs[3] * rhs[4] + lhs[7] * rhs[5] + lhs[11] * rhs[6] + lhs[15] * rhs[7],
		// Col 3
		lhs[0] * rhs[8] + lhs[4] * rhs[9] + lhs[8] * rhs[10] + lhs[12] * rhs[11],
		lhs[1] * rhs[8] + lhs[5] * rhs[9] + lhs[9] * rhs[10] + lhs[13] * rhs[11],
		lhs[2] * rhs[8] + lhs[6] * rhs[9] + lhs[10] * rhs[10] + lhs[14] * rhs[11],
		lhs[3] * rhs[8] + lhs[7] * rhs[9] + lhs[11] * rhs[10] + lhs[15] * rhs[11],
		// Col 4
		lhs[0] * rhs[12] + lhs[4] * rhs[13] + lhs[8] * rhs[14] + lhs[12] * rhs[15],
		lhs[1] * rhs[12] + lhs[5] * rhs[13] + lhs[9] * rhs[14] + lhs[13] * rhs[15],
		lhs[2] * rhs[12] + lhs[6] * rhs[13] + lhs[10] * rhs[14] + lhs[14] * rhs[15],
		lhs[3] * rhs[12] + lhs[7] * rhs[13] + lhs[11] * rhs[14] + lhs[15] * rhs[15]
	];
}

/** Create vector combining lhs and rhs */
export function add(lhs: TVec3, rhs: TVec3): TVec3 {
	return [lhs[0] + rhs[0], lhs[1] + rhs[1], lhs[2] + rhs[2]];
}

/** Create vector from lhs to rhs */
export function sub(lhs: TVec3, rhs: TVec3): TVec3 {
	return [rhs[0] - lhs[0], rhs[1] - lhs[1], rhs[2] - lhs[2]]
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

export function dot(lhs: TVec3, rhs: TVec3): number {
	return lhs[0] * rhs[0] + lhs[1] * rhs[1] + lhs[2] * rhs[2];
}

export function cross(lhs: TVec3, rhs: TVec3): TVec3 {
	return [
		// Xyzzy
		lhs[1] * rhs[2] - lhs[2] * rhs[1],
		lhs[2] * rhs[0] - lhs[0] * rhs[2],
		lhs[0] * rhs[1] - lhs[1] * rhs[0]
	];
}

/** Create quaternion from euler angles */
export function fromRotation(pitch: number, yaw: number, roll: number = 0): TQuat {
	// Consider profiling: cos(x)^2 = 1 - sin(x)^2
	// Ideally the js optimiser uses the FSINCOS instruction here
	const halfPitch = pitch * 0.5;
	const halfRoll = roll * 0.5;
	const halfYaw = yaw * 0.5;
	const cU = Math.cos(halfPitch);
	const sU = Math.sin(halfPitch);
	const cV = Math.cos(halfYaw);
	const sV = Math.sin(halfYaw);
	const cW = Math.cos(halfRoll);
	const sW = Math.sin(halfRoll);
	return [
		cU * cV * cW + sU * sV * sW,
		sU * cV * cW - cU * sV * sW,
		cU * sV * cW + sU * cV * sW,
		cU * cV * sW - sU * sV * cW
	];
}

/** Create 3x3 matrix rotation subset form quaternion */
export function toMatrix([q0, q1, q2, q3]: TQuat): TMatrix3 {
	const q1s2 = q1 * q1 * 2;
	const q2s2 = q2 * q2 * 2;
	const q3s2 = q3 * q3 * 2;
	// Consider and profile if needed
	// const q1q22 = 2 * q1 * q2;
	return [
		1 - q2s2 - q3s2, 2 * q1 * q2 - 2 * q0 * q3, 2 * q1 * q3 + 2 * q0 * q2,
		2 * q1 * q2 + 2 * q0 * q3, 1 - q1s2 - q3s2, 2 * q2 * q3 - 2 * q0 * q1,
		2 * q1 * q3 - 2 * q0 * q2, 2 * q2 * q3 + 2 * q0 * q1, 1 - q1s2 - q2s2
	];
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
