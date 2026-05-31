@group(0) @binding(0) var<uniform> ambient: vec3f;

struct View {
	view: mat4x4f,
	proj: mat4x4f,
	viewProj: mat4x4f,
	invProj: mat4x4f,
	position: vec3f,
	direction: vec3f
}
@group(1) @binding(0) var<uniform> view: View;

struct Model {
	transform: mat4x4f,
	normal: mat3x3f
}
@group(2) @binding(0) var<uniform> model: Model;

struct Light {
	position: vec3f,
	color: vec3f,
	attenuation: vec3f
}
@group(3) @binding(0) var<uniform> light: Light;

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
		vec4f(normal * model.normal, 1),
		color
	);
}

struct FragmentOut {
	@location(0) normal: vec4f,
	@location(1) colour: vec4f
}

const modelDiffuse = 1;
const modelSpecular = 1;
const modelShininess = 1;

@fragment
fn fragmentShader(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec3f
) -> FragmentOut {
	let normalDir = normalize(normal.xyz);
	let lightVec = light.position - position.xyz;
	let lightDir = normalize(lightVec);

	// Diffuse - light/normal (with noise to help break up banding)
	let noise = (fract(sin(position.x + position.y + position.z) * 159233.67567) - 0.5) * 0.075;
	let diffuse = max(dot(lightDir, normalDir) + noise, 0.0);
	let diffuseCol = modelDiffuse * diffuse * light.color;

	// Specular - Blinn
	let viewDir = normalize(view.position - position.xyz);
	let midDir = normalize(lightDir + viewDir);
	let specular = pow(max(dot(normalDir, midDir), 0.0), modelShininess);
	let specularCol = modelSpecular * specular * light.color;

	// Distance attenuation
	let distance = length(lightVec);
	let attenuation = 1.0 / (
		light.attenuation.x +
		light.attenuation.y * distance +
		light.attenuation.z * (distance * distance)
	);

	// Accumulate light
	let light = fma(diffuseCol + specularCol, vec3(attenuation), ambient);

	return FragmentOut(
		normal,
		vec4(light * color, 1)
	);
	// return vec4(light * color, 1);
}

@group(3) @binding(0) var gSampler: sampler;
@group(3) @binding(1) var depthTexture: texture_depth_2d;
@group(3) @binding(2) var gNormal: texture_2d<f32>;
@group(3) @binding(3) var gColour: texture_2d<f32>;

@vertex
fn lightVertexShader(
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: vec3f
) -> VertexOut {
	let modelPosition = vec4f(position, 1) * model.transform;
	return VertexOut(
		modelPosition,
		modelPosition,
		vec4f(normal * model.normal, 1),
		color
	);
}

@fragment
fn lightFragmentShader(
	@builtin(position) fragment: vec4f,
	@location(0) position: vec4f,
	@location(1) normal: vec4f,
	@location(2) color: vec3f
) -> @location(0) vec4f {
	// Convert xy positions into gbuffer texture uv
	let viewProjX = 0.5 * (position.x + 1);
	let viewProjY = -0.5 * (position.y - 1);
	let tex = vec2f(viewProjX, viewProjY);
	// TODO fetch via textureLoad?
	// let viewProjZ = textureSample(depthTexture, gSampler, tex);
	// return vec4f(viewProjZ, viewProjZ, viewProjZ, 1);

	// Inverse project to view space surface position
	// let surfacePos = vec4f(viewProjX, viewProjY, viewProjZ, 1) * view.invProj;

	let albedo = textureSample(gColour, gSampler, tex);
	return albedo;

	// let surfaceNormal = textureSample(gNormal, gSampler, tex);
	// return surfaceNormal;

	// return vec4f((albedo + surfaceNormal + surfacePos).xyz, 1);
}
