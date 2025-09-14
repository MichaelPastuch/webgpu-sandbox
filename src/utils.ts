import { TWO_PI } from "./constants";

export type TVec3 = [number, number, number];

export type TQuat = [number, number, number, number];

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

export function matrixMultiply(lhs: TMatrix4, rhs: TMatrix4): TMatrix4 {
	return [
		// Row 1
		lhs[0] * rhs[0] + lhs[1] * rhs[4] + lhs[2] * rhs[8] + lhs[3] * rhs[12],
		lhs[0] * rhs[1] + lhs[1] * rhs[5] + lhs[2] * rhs[9] + lhs[3] * rhs[13],
		lhs[0] * rhs[2] + lhs[1] * rhs[6] + lhs[2] * rhs[10] + lhs[3] * rhs[14],
		lhs[0] * rhs[3] + lhs[1] * rhs[7] + lhs[2] * rhs[11] + lhs[3] * rhs[15],
		// Row 2
		lhs[4] * rhs[0] + lhs[5] * rhs[4] + lhs[6] * rhs[8] + lhs[7] * rhs[12],
		lhs[4] * rhs[1] + lhs[5] * rhs[5] + lhs[6] * rhs[9] + lhs[7] * rhs[13],
		lhs[4] * rhs[2] + lhs[5] * rhs[6] + lhs[6] * rhs[10] + lhs[7] * rhs[14],
		lhs[4] * rhs[3] + lhs[5] * rhs[7] + lhs[6] * rhs[11] + lhs[7] * rhs[15],
		// Row 3
		lhs[8] * rhs[0] + lhs[9] * rhs[4] + lhs[10] * rhs[8] + lhs[11] * rhs[12],
		lhs[8] * rhs[1] + lhs[9] * rhs[5] + lhs[10] * rhs[9] + lhs[11] * rhs[13],
		lhs[8] * rhs[2] + lhs[9] * rhs[6] + lhs[10] * rhs[10] + lhs[11] * rhs[14],
		lhs[8] * rhs[3] + lhs[9] * rhs[7] + lhs[10] * rhs[11] + lhs[11] * rhs[15],
		// Row 4
		lhs[12] * rhs[0] + lhs[13] * rhs[4] + lhs[14] * rhs[8] + lhs[15] * rhs[12],
		lhs[12] * rhs[1] + lhs[13] * rhs[5] + lhs[14] * rhs[9] + lhs[15] * rhs[13],
		lhs[12] * rhs[2] + lhs[13] * rhs[6] + lhs[14] * rhs[10] + lhs[15] * rhs[14],
		lhs[12] * rhs[3] + lhs[13] * rhs[7] + lhs[14] * rhs[11] + lhs[15] * rhs[15]
	];
}

/** Create vector from lhs to rhs */
export function vector(lhs: TVec3, rhs: TVec3): TVec3 {
	return [rhs[0] - lhs[0], rhs[1] - lhs[1], rhs[2] - lhs[2]]
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

/** Add a delta to a given angle and wrap in the range 0 - 2Pi */
export function wrapRadians(radians: number, delta: number) {
	const newRadians = radians + delta;
	if (newRadians > TWO_PI) {
		return newRadians - TWO_PI;
	} else if (newRadians < 0) {
		return newRadians + TWO_PI;
	} else {
		return newRadians;
	}
}
