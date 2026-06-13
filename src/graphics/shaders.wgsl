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

struct LightOut {
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f
}

@vertex
fn quadVertexShader(
	@location(0) position: vec3f
) -> LightOut {
	// Don't apply camera transform for full-screen quad
	let lightPosition = vec4f(position, 1);
	return LightOut(
		lightPosition,
		lightPosition
	);
}

@vertex
fn lightVertexShader(
	@location(0) position: vec3f
) -> LightOut {
	let lightPosition = vec4f(position, 1) * light.transform;
	return LightOut(
		// TODO apply camera transform
		lightPosition,
		lightPosition
	);
}

// Get surface position in view space from clip position and depth buffer
fn surfacePos(clipX: f32, clipY: f32, depth: f32) -> vec3f {
	let surfaceClipPos = vec4f(clipX, clipY, depth, 1);
	let invProjPos = surfaceClipPos * view.invProj;
	return invProjPos.xyz / invProjPos.w;
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
fn directionalLightFragment(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f
) -> @location(0) vec4f {
	let tex = vec2u(fragment.xy);
	let depth = textureLoad(depthTexture, tex, 0);
	let surfacePos = surfacePos(position.x, position.y, depth);
	let surfaceNormal = normalize(textureLoad(gNormal, tex, 0).xyz);
	let albedo = textureLoad(gColor, tex, 0);

	// TODO light direction in view space
	let lightDir = normalize(light.position.xyz);

	let light = (
		modelDiffuse * diffuse(lightDir, surfaceNormal) +
		modelSpecular * specular(lightDir, surfaceNormal, normalize(-surfacePos.xyz), modelShininess)
	) * light.color;
	return vec4(light * albedo.xyz, 1);
}

@fragment
fn pointLightFragment(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f
) -> @location(0) vec4f {
	let tex = vec2u(fragment.xy);
	let depth = textureLoad(depthTexture, tex, 0);
	let surfacePos = surfacePos(position.x, position.y, depth);
	let surfaceNormal = normalize(textureLoad(gNormal, tex, 0).xyz);
	let albedo = textureLoad(gColor, tex, 0);

	let lightVec = light.viewPosition.xyz - surfacePos.xyz;
	let distance = length(lightVec);
	let lightDir = lightVec / distance;

	let light = (
		modelDiffuse * diffuse(lightDir, surfaceNormal) +
		modelSpecular * specular(lightDir, surfaceNormal, normalize(-surfacePos.xyz), modelShininess)
	) * attenuation(distance, light.attenuation) * light.color;
	return vec4(light * albedo.xyz, 1);
}

// Post shaders and bindings
@group(0) @binding(0) var colorTexture: texture_2d<f32>;

// const gamma = 2.2;
const gamma = 1.4;
const gammaPow = vec3f(1.0 / gamma);
fn gammaCorrection(color: vec3f) -> vec3f {
	return pow(color, gammaPow);
}

fn vignette(clipX: f32, clipY: f32) -> f32 {
	return smoothstep(3.0, 1.0, clipX * clipX + clipY * clipY);
}

fn rand(input: vec2f) -> f32 {
	return fract(sin(dot(input, vec2f(41.833, 97.9797))) * 159233.67567);
}

const noiseFract = 0.99;
const noiseScale = (1.0 - noiseFract) * 2.0;

// Scaled noise for given fragment xy position
fn noise(frag2d: vec2f) -> f32 {
	return noiseFract + noiseScale * rand(frag2d.xy * 0.67);
}

@fragment
fn postFragment(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f
) -> @location(0) vec4f {
	return vec4(
		vignette(position.x, position.y) *
		noise(fragment.xy) *
		gammaCorrection(textureLoad(colorTexture, vec2u(fragment.xy), 0).xyz),
		1
	);
}
