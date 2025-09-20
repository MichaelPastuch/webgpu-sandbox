
/** For engine use only */
export abstract class TimeManager {

	static engineTime: number = 0;
	static engineDelta: number = 0;
	static engineScale: number = 0;

	static frameTime: number = 0;
	static frameDelta: number = 0;
	static frameScale: number = 0;

	static set engineUpdate(value: number) {
		this.engineDelta = value - this.engineTime;
		this.engineScale = this.engineDelta * 0.001;
		this.engineTime = value;
		// Also update frame time
		this.frameUpdate = value;
	}

	static set frameUpdate(value: number) {
		this.frameDelta = value - this.frameTime;
		this.frameScale = this.frameDelta * 0.001;
		this.frameTime = value;
	}

}

interface ITime {
	readonly engineTime: number;
	readonly engineDelta: number;
	readonly engineScale: number;
	readonly frameTime: number;
	readonly frameDelta: number;
	readonly frameScale: number;
}

export const Time = TimeManager as ITime;

// TODO Read only version for use by any entities

/** Helper class for tracking time passed between engine ticks and frame creation */
// export abstract class Time { }
