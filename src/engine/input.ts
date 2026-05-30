
export const enum Keybind {
	// D-pad
	UP = "KeyW",
	DOWN = "KeyS",
	LEFT = "KeyA",
	RIGHT = "KeyD",
	// Face button
	FACE_UP = "KeyE",
	FACE_DOWN = "Space",
	FACE_LEFT = "KeyQ",
	FACE_RIGHT = "ControlLeft",
	// Shoulder
	LEFT_BUMPER = "ShiftLeft",
	RIGHT_BUMPER = "KeyC",
	// Function
	FULLSCREEN = "Enter",
	PAUSE = "NumpadEnter",
	RESET = "Home"
}

export const enum Mouse {
	LEFT_CLICK = 0,
	RIGHT_CLICK = 2
}

export class Input {

	static readonly LEFT_CLICK = 0;
	static readonly RIGHT_CLICK = 2;

	private static readonly keyTracker: Record<Keybind, 0 | 1> = {
		[Keybind.UP]: 0,
		[Keybind.DOWN]: 0,
		[Keybind.LEFT]: 0,
		[Keybind.RIGHT]: 0,
		[Keybind.FACE_UP]: 0,
		[Keybind.FACE_DOWN]: 0,
		[Keybind.FACE_LEFT]: 0,
		[Keybind.FACE_RIGHT]: 0,
		[Keybind.LEFT_BUMPER]: 0,
		[Keybind.RIGHT_BUMPER]: 0,
		[Keybind.FULLSCREEN]: 0,
		[Keybind.PAUSE]: 0,
		[Keybind.RESET]: 0
	}

	private static readonly mouseTracker: Record<Mouse, 0 | 1> = {
		[Mouse.LEFT_CLICK]: 0,
		[Mouse.RIGHT_CLICK]: 1
	}

	private static keyDown(event: KeyboardEvent) {
		if (event.code in Input.keyTracker) {
			Input.keyTracker[event.code as Keybind] = 1;
		}
	}
	private static keyUp(event: KeyboardEvent) {
		if (event.code in Input.keyTracker) {
			Input.keyTracker[event.code as Keybind] = 0;
		}
	}

	private static mouseX = 0;
	private static mouseY = 0;
	private static trackMovement(event: MouseEvent) {
		Input.mouseX += event.movementX;
		Input.mouseY += event.movementY;
	}

	private static mouseDown(event: MouseEvent) {
		// MacOS Note: ctrl + LEFT_CLICK = RIGHT_CLICK
		if (event.button in Input.mouseTracker) {
			Input.mouseTracker[event.button as Mouse] = 1;
		}
	}
	private static mouseUp(event: MouseEvent) {
		if (event.button in Input.mouseTracker) {
			Input.mouseTracker[event.button as Mouse] = 0;
		}
	}

	public static enable() {
		document.addEventListener("keydown", Input.keyDown);
		document.addEventListener("keyup", Input.keyUp);
		document.addEventListener("mousemove", Input.trackMovement);
		document.addEventListener("mousedown", Input.mouseDown);
		document.addEventListener("mouseup", Input.mouseUp);
	}

	public static disable() {
		document.removeEventListener("keydown", Input.keyDown);
		document.removeEventListener("keyup", Input.keyUp);
		document.removeEventListener("mousemove", Input.trackMovement);
		document.removeEventListener("mousedown", Input.mouseDown);
		document.removeEventListener("mouseup", Input.mouseUp);
		// "Unset" all mouse/keyboard tracking
		for (const key of Object.keys(Input.keyTracker)) {
			Input.keyTracker[key as Keybind] = 0;
		}
		Input.mouseTracker[Mouse.LEFT_CLICK] = 0;
		Input.mouseTracker[Mouse.RIGHT_CLICK] = 0;
	}

	/** Get key hold value */
	public static key(key: Keybind) {
		return Input.keyTracker[key];
	}
	/** Clear key hold value */
	public static clearKey(key: Keybind) {
		Input.keyTracker[key] = 0;
	}

	/** Get mouse hold value */
	public static mouse(key: Mouse) {
		return Input.mouseTracker[key];
	}

	/** Read accumulated mouse x movement and reset */
	public static get readX() {
		const readX = Input.mouseX;
		Input.mouseX = 0;
		return readX;
	}

	/** Read accumulated mouse y movement and reset */
	public static get readY() {
		const readY = Input.mouseY;
		Input.mouseY = 0;
		return readY;
	}

}
