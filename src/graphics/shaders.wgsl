// Global bindings

@group(0) @binding(0) var<uniform> ambient: vec3f;

struct View {
	view: mat4x4f,
	proj: mat4x4f,
	viewProj: mat4x4f,
	invProj: mat4x4f,
	normal: mat3x3f,
	position: vec3f,
	direction: vec3f
}
@group(1) @binding(0) var<uniform> view: View;

// const gamma = 2.2;
const gamma = 1.4;
const gammaPow = vec3f(1.0 / gamma);

// Forward shaders and bindings

struct Model {
	transform: mat4x4f,
	normal: mat3x3f
}
@group(2) @binding(0) var<uniform> model: Model;

struct VertexOut {
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec3f
}

@vertex
fn vertexShader(
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: vec3f
) -> VertexOut {
	let modelPosition = vec4f(position, 1) * model.transform;
	return VertexOut(
		modelPosition * view.viewProj,
		modelPosition,
		// Transform normal into view space
		vec4f((normal * model.normal) * view.normal, 1),
		color
	);
}

struct FragmentOut {
	@location(0) normal: vec4f,
	@location(1) color: vec4f
}

// TODO Pack these values in the gBuffer, normal and colour have spare w components
const modelDiffuse = 1.0;
const modelSpecular = 1.0;
const modelShininess = 16.0;

@fragment
fn fragmentShader(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec3f
) -> FragmentOut {
	return FragmentOut(
		// TODO Can we store normal as view space adjustments relative to origin?
		normal,
		vec4(color, 1)
	);
}

// Deferred shaders and bindings

@group(2) @binding(0) var depthTexture: texture_depth_2d;
@group(2) @binding(1) var gNormal: texture_2d<f32>;
@group(2) @binding(2) var gColor: texture_2d<f32>;

struct Light {
	transform: mat4x4f,
	position: vec4f,
	viewPosition: vec4f,
	color: vec3f,
	attenuation: vec3f
}
@group(3) @binding(0) var<uniform> light: Light;

@vertex
fn lightVertexShader(
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: vec3f
) -> VertexOut {
	let lightPosition = vec4f(position, 1) * light.transform;
	return VertexOut(
		// Don't apply camera transform for directional light
		lightPosition,
		lightPosition,
		vec4f(normal, 1),
		color
	);
}

fn attenuation(distance: f32, factors: vec3f) -> f32 {
	let attenuation = 1.0 / (
		factors.x +
		factors.y * distance +
		factors.z * (distance * distance)
	);
	// Ignore very low attenuation (when less than ~1/255)
	return step(0.004, attenuation) * attenuation;
}

fn diffuse(lightDir: vec3f, surfaceNormal: vec3f) -> f32 {
	return max(dot(lightDir, surfaceNormal), 0.0);
}

// Blinn
fn specular(lightDir: vec3f, surfaceNormal: vec3f, viewDir: vec3f, shininess: f32) -> f32 {
	return pow(max(dot(normalize(lightDir + viewDir), surfaceNormal), 0.0), shininess);
}

@fragment
fn lightFragmentShader(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec3f
) -> @location(0) vec4f {
	let tex = vec2u(fragment.xy);
	let depth = textureLoad(depthTexture, tex, 0);
	let surfaceClipPos = vec4f(position.x, position.y, depth, 1);
	// Inverse project to view space surface position
	let invProjPos = surfaceClipPos * view.invProj;
	let surfacePos = invProjPos.xyz / invProjPos.w;
	let surfaceNormal = normalize(textureLoad(gNormal, tex, 0).xyz);
	let albedo = textureLoad(gColor, tex, 0);

	// Debug gbuffer views
	// return vec4f(0, depth * depth * depth, 0, 1);
	// return vec4f(0.5 * (surfaceClipPos.xy + 1), surfaceClipPos.z, 1);
	// return vec4f((4 + surfacePos) * 0.05, 1);
	// return vec4f(abs(surfaceNormal), 1);
	// return albedo;

	let lightVec = light.viewPosition.xyz - surfacePos.xyz;
	let distance = length(lightVec);
	let lightDir = lightVec / distance;

	let attenScale = attenuation(distance, light.attenuation);
	let diffuseCol = modelDiffuse * diffuse(lightDir, surfaceNormal) * attenScale * light.color;
	let specularCol = modelSpecular * specular(lightDir, surfaceNormal, normalize(-surfacePos.xyz), modelShininess) * attenScale * light.color;

	// Accumulate light
	let light = ambient + diffuseCol + specularCol;
	// return vec4(light, 1);

	// Apply gamma correction
	return vec4(pow(light * albedo.xyz, gammaPow), 1);
}
