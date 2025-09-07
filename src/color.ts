type TColor = [number, number, number, number];

/** Color helper for quick access to float4 sets of values */
export abstract class Color {

	public static readonly red: TColor = [1, 0, 0, 1];
	public static readonly green: TColor = [0, 1, 0, 1];
	public static readonly blue: TColor = [0, 0, 1, 1];
	public static readonly cyan: TColor = [0, 1, 1, 1];
	public static readonly magenta: TColor = [1, 0, 1, 1];
	public static readonly yellow: TColor = [1, 1, 0, 1];
	public static readonly black: TColor = [0, 0, 0, 1];
	public static readonly white: TColor = [1, 1, 1, 1];

	private static readonly colMap: ReadonlyMap<string, TColor> = new Map([
		["r", this.red],
		["g", this.green],
		["b", this.blue],
		["c", this.cyan],
		["m", this.magenta],
		["y", this.yellow],
		["0", this.black],
		["1", this.white]
	]);

	/** Resolve single character color reference, 1 and 0 are special characters for white and black */
	public static fromChar(character?: string) {
		return (character ? this.colMap.get(character) : null) ?? this.black;
	}

}
