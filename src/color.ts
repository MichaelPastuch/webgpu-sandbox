import { overflow } from "./utils";

type TColor = [number, number, number];

/** Color helper for quick access to float4 sets of values */
export class Color {

	public static readonly red: TColor = [1, 0, 0,];
	public static readonly green: TColor = [0, 1, 0];
	public static readonly blue: TColor = [0, 0, 1];
	public static readonly cyan: TColor = [0, 1, 1];
	public static readonly magenta: TColor = [1, 0, 1];
	public static readonly yellow: TColor = [1, 1, 0];
	public static readonly black: TColor = [0, 0, 0];
	public static readonly white: TColor = [1, 1, 1];

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

	private colorIdx = 0;
	private overflow: (value: number, delta: number) => number;

	constructor(private readonly colors: string) {
		this.overflow = overflow(0, colors.length - 1);
	}

	/** Get next color, wrapping back to the start */
	public next(): TColor {
		const idx = this.colorIdx;
		this.colorIdx = this.overflow(this.colorIdx, 1);
		return Color.fromChar(this.colors.at(idx));
	}

}
