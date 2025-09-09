
export type TVec3 = [number, number, number];

export type TMatrix = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

export const identity: TMatrix = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
];

export function matrixMultiply(lhs: TMatrix, rhs: TMatrix): TMatrix {
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

export function cross(lhs: TVec3, rhs: TVec3): TVec3 {
	return [
		lhs[2] * rhs[1] - lhs[1] * rhs[2],
		-(lhs[2] * rhs[0] - lhs[0] * rhs[2]),
		lhs[1] * rhs[0] - lhs[0] * rhs[1]
	];
}
