
export class Input {

	static readonly LEFT_CLICK = 0;
	static readonly RIGHT_CLICK = 2;

	private static readonly keyTracker = new Set<string>();
	private static keyDown(event: KeyboardEvent) {
		Input.keyTracker.add(event.key);
	}
	private static keyUp(event: KeyboardEvent) {
		Input.keyTracker.delete(event.key);
	}

	private static mouseX = 0;
	private static mouseY = 0;
	private static trackMovement(event: MouseEvent) {
		Input.mouseX += event.movementX;
		Input.mouseY += event.movementY;
	}

	private static readonly buttonTracker = new Set<number>();
	private static mouseDown(event: MouseEvent) {
		Input.buttonTracker.add(event.button);
	}
	private static mouseUp(event: MouseEvent) {
		Input.buttonTracker.delete(event.button);
	}

	public static enable() {
		document.addEventListener("keydown", Input.keyDown, false);
		document.addEventListener("keyup", Input.keyUp, false);
		document.addEventListener("mousemove", Input.trackMovement, false);
		document.addEventListener("mousedown", Input.mouseDown, false);
		document.addEventListener("mouseup", Input.mouseUp, false);
	}

	public static disable() {
		document.removeEventListener("keydown", Input.keyDown, false);
		document.removeEventListener("keyup", Input.keyUp, false);
		document.removeEventListener("mousemove", Input.trackMovement, false);
		document.removeEventListener("mousedown", Input.mouseDown, false);
		document.removeEventListener("mouseup", Input.mouseUp, false);
		// "Unset" all mouse/keyboard tracking
		Input.keyTracker.clear();
		Input.buttonTracker.clear();
	}

	/** Get set of held keys */
	public static get keys(): ReadonlySet<string> {
		return Input.keyTracker;
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

	/** Get set of held buttons */
	public static get buttons(): ReadonlySet<number> {
		return Input.buttonTracker;
	}

}
