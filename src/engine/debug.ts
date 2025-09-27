
export function widgetBox() {
	const box = document.createElement("div");
	box.style.display = "flex";
	box.style.gap = "0.5rem";
	return box;
}

interface IWidgetConfig {
	readonly label: string;
	readonly initialValue: number;
	readonly type?: "number" | "range";
	readonly min?: number;
	readonly max?: number;
	onChange(value: number): void;
}

export function widget({
	label, initialValue,
	type = "range", min, max,
	onChange
}: IWidgetConfig) {
	const container = document.createElement("div");
	const lbl = document.createElement("pre");
	lbl.innerText = label;
	container.append(lbl);
	const input = document.createElement("input");
	input.type = type;
	input.value = String(initialValue);
	if (min != null) {
		input.min = String(min);
	}
	if (max != null) {
		input.max = String(max);
	}
	input.addEventListener("input", function () {
		const num = Number.parseInt(this.value);
		if (Number.isFinite(num)) {
			onChange(num);
		}
	});
	container.append(input);
	return container;
}

export function monitor<T>(label: string): [
	HTMLElement,
	(newValue: T) => void
] {
	const container = document.createElement("div");
	const lbl = document.createElement("pre");
	lbl.innerText = label;
	container.append(lbl);
	const value = document.createElement("pre");
	container.append(value);
	let lastValue: T | null = null;
	return [
		container,
		function (newValue: T) {
			if (newValue !== lastValue) {
				lastValue = newValue;
				value.innerText = String(newValue);
			}
		}
	]
}
