
/** For engine use only */
export abstract class TimeManager {

	static time: number = 0;
	static delta: number = 0;
	static scale: number = 0;

	static set update(value: number) {
		this.delta = value - this.time;
		this.scale = this.delta * 0.001;
		this.time = value;
	}

}

// TODO Read only version for use by any entities

/** Helper class for tracking time passed between engine ticks and frame creation */
// export abstract class Time { }
