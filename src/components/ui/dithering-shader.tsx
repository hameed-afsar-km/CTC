"use client";

import type React from "react";

import { useEffect, useRef } from "react";

// GLSL utility functions
const declarePI = `
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`;

const proceduralHash11 = `
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`;

const proceduralHash21 = `
  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
`;

const simplexNoise = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

// Vertex shader
const vertexShaderSource = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

void main() {
  gl_Position = a_position;
}
`;

// Fragment shader
const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;
uniform float u_pxSize;

out vec4 fragColor;

${simplexNoise}
${declarePI}
${proceduralHash11}
${proceduralHash21}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));
  return noise;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
  0,  8,  2, 10,
 12,  4, 14,  6,
  3, 11,  1,  9,
 15,  7, 13,  5
);

const int bayer8x8[64] = int[64](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(mod(uv, float(size)));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}

void main() {
  float t = .5 * u_time;
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= .5;

  // Apply pixelization
  float pxSize = u_pxSize;
  vec2 pxSizeUv = gl_FragCoord.xy;
  pxSizeUv -= .5 * u_resolution;
  pxSizeUv /= pxSize;
  vec2 pixelizedUv = floor(pxSizeUv) * pxSize / u_resolution.xy;
  pixelizedUv += .5;
  pixelizedUv -= .5;

  vec2 shape_uv = pixelizedUv;
  vec2 dithering_uv = pxSizeUv;
  vec2 ditheringNoise_uv = uv * u_resolution;

  float shape = 0.;
  if (u_shape < 1.5) {
    // Simplex noise
    shape_uv *= .001;
    shape = 0.5 + 0.5 * getSimplexNoise(shape_uv, t);
    shape = smoothstep(0.3, 0.9, shape);

  } else if (u_shape < 2.5) {
    // Warp
    shape_uv *= .003;
    for (float i = 1.0; i < 6.0; i++) {
      shape_uv.x += 0.6 / i * cos(i * 2.5 * shape_uv.y + t);
      shape_uv.y += 0.6 / i * cos(i * 1.5 * shape_uv.x + t);
    }
    shape = .15 / abs(sin(t - shape_uv.y - shape_uv.x));
    shape = smoothstep(0.02, 1., shape);

  } else if (u_shape < 3.5) {
    // Dots
    shape_uv *= .05;
    float stripeIdx = floor(2. * shape_uv.x / TWO_PI);
    float rand = hash11(stripeIdx * 10.);
    rand = sign(rand - .5) * pow(.1 + abs(rand), .4);
    shape = sin(shape_uv.x) * cos(shape_uv.y - 5. * rand * t);
    shape = pow(abs(shape), 6.);

  } else if (u_shape < 4.5) {
    // Sine wave
    shape_uv *= 4.;
    float wave = cos(.5 * shape_uv.x - 2. * t) * sin(1.5 * shape_uv.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shape_uv.y + wave);

  } else if (u_shape < 5.5) {
    // Ripple
    float dist = length(shape_uv);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;

  } else if (u_shape < 6.5) {
    // Swirl
    float l = length(shape_uv);
    float angle = 6. * atan(shape_uv.y, shape_uv.x) + 4. * t;
    float twist = 1.2;
    float offset = pow(l, -twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);

  } else {
    // Sphere
    shape_uv *= 2.;
    float d = 1. - pow(length(shape_uv), 2.);
    vec3 pos = vec3(shape_uv, sqrt(d));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }

  int type = int(floor(u_type));
  float dithering = 0.0;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoise_uv), shape);
    } break;
    case 2:
      dithering = getBayerValue(dithering_uv, 2);
      break;
    case 3:
      dithering = getBayerValue(dithering_uv, 4);
      break;
    default:
      dithering = getBayerValue(dithering_uv, 8);
      break;
  }

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`;

// Shape and type enums
export const DitheringShapes = {
	simplex: 1,
	warp: 2,
	dots: 3,
	wave: 4,
	ripple: 5,
	swirl: 6,
	sphere: 7,
} as const;

export const DitheringTypes = {
	random: 1,
	"2x2": 2,
	"4x4": 3,
	"8x8": 4,
} as const;

export type DitheringShape = keyof typeof DitheringShapes;
export type DitheringType = keyof typeof DitheringTypes;

interface DitheringShaderProps {
	width?: number;
	height?: number;
	colorBack?: string;
	colorFront?: string;
	shape?: DitheringShape;
	type?: DitheringType;
	pxSize?: number;
	speed?: number;
	/**
	 * Maximum device-pixel-ratio used for the canvas backing store. Lower values
	 * cut GPU memory and per-frame fill cost proportionally — 1 matches CSS
	 * pixels, which is ideal for the chunky pixelated dither look.
	 */
	pixelRatio?: number;
	className?: string;
	style?: React.CSSProperties;
	/**
	 * When true the canvas tracks its parent's box (via ResizeObserver) instead
	 * of using the fixed `width`/`height`. Lets the same component back a
	 * full-viewport instrument without changing its core render. Defaults to
	 * false so the documented fixed-size API is unchanged.
	 */
	fill?: boolean;
	/**
	 * Optional probe. Fired a few times a second with the fraction of lit
	 * (foreground) pixels in the rendered frame, sampled straight off the GL
	 * framebuffer — so an external HUD can read real "beam coverage" instead of
	 * estimating it.
	 */
	onSample?: (coverage: number) => void;
}

function hexToRgba(hex: string): [number, number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return [0, 0, 0, 1];

	return [
		Number.parseInt(result[1], 16) / 255,
		Number.parseInt(result[2], 16) / 255,
		Number.parseInt(result[3], 16) / 255,
		1,
	];
}

function createShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(
			`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
		);
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function createProgram(
	gl: WebGL2RenderingContext,
	vertexShaderSource: string,
	fragmentShaderSource: string,
): WebGLProgram | null {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(
		gl,
		gl.FRAGMENT_SHADER,
		fragmentShaderSource,
	);

	if (!vertexShader || !fragmentShader) return null;

	const program = gl.createProgram();
	if (!program) return null;

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error(
			"Unable to initialize the shader program: " +
				gl.getProgramInfoLog(program),
		);
		gl.deleteProgram(program);
		return null;
	}

	return program;
}

export function DitheringShader({
	width = 800,
	height = 800,
	colorBack = "#000000",
	colorFront = "#ffffff",
	shape = "simplex",
	type = "8x8",
	pxSize = 4,
	speed = 1,
	pixelRatio = 1,
	className = "",
	style = {},
	fill = false,
	onSample,
}: DitheringShaderProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationRef = useRef<number | null>(null);
	const programRef = useRef<WebGLProgram | null>(null);
	const glRef = useRef<WebGL2RenderingContext | null>(null);
	const uniformLocationsRef = useRef<
		Record<string, WebGLUniformLocation | null>
	>({});
	const startTimeRef = useRef<number>(0);
	// Live size — seeded from props, then updated by the ResizeObserver in fill
	// mode. Kept in a ref so the render loop never closes over a stale value.
	const sizeRef = useRef<{ w: number; h: number }>({ w: width, h: height });
	// Reused readback buffer for the coverage probe, resized with the canvas so
	// each sample is a single GPU→CPU read instead of thousands of 1px reads.
	const readBufRef = useRef<Uint8Array | null>(null);
	const sampleRef = useRef(onSample);
	// Whether the canvas is currently on screen — the render loop pauses while
	// offscreen to stop burning GPU/CPU on hidden sections.
	const isVisibleRef = useRef(true);

	useEffect(() => {
		sampleRef.current = onSample;
	}, [onSample]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		startTimeRef.current = Date.now();

		const gl = canvas.getContext("webgl2");
		if (!gl) {
			console.error("WebGL2 not supported");
			return;
		}

		glRef.current = gl;

		// Create shader program
		const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
		if (!program) return;

		programRef.current = program;

		// Get uniform locations
		uniformLocationsRef.current = {
			u_time: gl.getUniformLocation(program, "u_time"),
			u_resolution: gl.getUniformLocation(program, "u_resolution"),
			u_colorBack: gl.getUniformLocation(program, "u_colorBack"),
			u_colorFront: gl.getUniformLocation(program, "u_colorFront"),
			u_shape: gl.getUniformLocation(program, "u_shape"),
			u_type: gl.getUniformLocation(program, "u_type"),
			u_pxSize: gl.getUniformLocation(program, "u_pxSize"),
		};

		// Set up position attribute
		const positionAttributeLocation = gl.getAttribLocation(
			program,
			"a_position",
		);
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

		// Resolve the device-pixel-accurate render size for the current layout.
		const computeSize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, pixelRatio);
			if (fill) {
				const parent = canvas.parentElement;
				const rect = parent?.getBoundingClientRect();
				const cssW = Math.max(1, Math.round(rect?.width ?? width));
				const cssH = Math.max(1, Math.round(rect?.height ?? height));
				return { w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) };
			}
			return { w: width, h: height };
		};

		const applySize = () => {
			const { w, h } = computeSize();
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			sizeRef.current = { w, h };
			gl.viewport(0, 0, w, h);
		};

		applySize();

		let resizeObserver: ResizeObserver | undefined;
		if (fill && canvas.parentElement && "ResizeObserver" in window) {
			resizeObserver = new ResizeObserver(() => applySize());
			resizeObserver.observe(canvas.parentElement);
		}

		// Coverage probe for the HUD: read the whole framebuffer once per tick (a
		// single GPU→CPU sync) into a reused buffer, then sample a sparse grid on
		// the CPU and report the fraction of pixels closer to the foreground colour.
		const fgRgb = hexToRgba(colorFront);
		const bgRgb = hexToRgba(colorBack);
		const fg255 = [fgRgb[0] * 255, fgRgb[1] * 255, fgRgb[2] * 255];
		const bg255 = [bgRgb[0] * 255, bgRgb[1] * 255, bgRgb[2] * 255];
		let lastSample = 0;

		const sampleCoverage = (now: number) => {
			const cb = sampleRef.current;
			if (!cb || now - lastSample < 200) return;
			lastSample = now;
			const { w, h } = sizeRef.current;
			if (w < 2 || h < 2) return;

			const need = w * h * 4;
			if (!readBufRef.current || readBufRef.current.length !== need) {
				readBufRef.current = new Uint8Array(need);
			}
			const buf = readBufRef.current;
			gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

			const cols = 64;
			const rows = 64;
			let lit = 0;
			let total = 0;
			for (let gy = 0; gy < rows; gy++) {
				const y = Math.min(h - 1, Math.floor(((gy + 0.5) / rows) * h));
				for (let gx = 0; gx < cols; gx++) {
					const x = Math.min(w - 1, Math.floor(((gx + 0.5) / cols) * w));
					const idx = (y * w + x) * 4;
					const dF =
						(buf[idx] - fg255[0]) ** 2 +
						(buf[idx + 1] - fg255[1]) ** 2 +
						(buf[idx + 2] - fg255[2]) ** 2;
					const dB =
						(buf[idx] - bg255[0]) ** 2 +
						(buf[idx + 1] - bg255[1]) ** 2 +
						(buf[idx + 2] - bg255[2]) ** 2;
					if (dF < dB) lit++;
					total++;
				}
			}
			cb(total > 0 ? lit / total : 0);
		};

		// Animation loop
		const render = () => {
			if (!isVisibleRef.current) {
				animationRef.current = null;
				return;
			}

			const currentTime = (Date.now() - startTimeRef.current) * 0.001 * speed;

			const context = glRef.current;
			const shaderProgram = programRef.current;

			if (!context || !shaderProgram) return;

			const { w, h } = sizeRef.current;

			context.clear(context.COLOR_BUFFER_BIT);
			context.useProgram(shaderProgram);

			// Set uniforms
			const locations = uniformLocationsRef.current;

			if (locations.u_time) context.uniform1f(locations.u_time, currentTime);
			if (locations.u_resolution)
				context.uniform2f(locations.u_resolution, w, h);
			if (locations.u_colorBack)
				context.uniform4fv(locations.u_colorBack, hexToRgba(colorBack));
			if (locations.u_colorFront)
				context.uniform4fv(locations.u_colorFront, hexToRgba(colorFront));
			if (locations.u_shape)
				context.uniform1f(locations.u_shape, DitheringShapes[shape]);
			if (locations.u_type)
				context.uniform1f(locations.u_type, DitheringTypes[type]);
			if (locations.u_pxSize) context.uniform1f(locations.u_pxSize, pxSize);

			context.drawArrays(context.TRIANGLES, 0, 6);

			sampleCoverage(performance.now());

			if (speed !== 0) {
				animationRef.current = requestAnimationFrame(render);
			}
		};

		const startAnimation = () => {
			if (speed !== 0) {
				if (!animationRef.current) {
					animationRef.current = requestAnimationFrame(render);
				}
			} else {
				// Still draw a single frame so a frozen shader is visible.
				render();
			}
		};

		// Pause the loop when the canvas scrolls out of view and resume it on the
		// way back, so off-screen sections stop consuming GPU resources.
		let visibilityObserver: IntersectionObserver | undefined;
		if ("IntersectionObserver" in window) {
			visibilityObserver = new IntersectionObserver(
				(entries) => {
					const entry = entries[0];
					isVisibleRef.current = entry?.isIntersecting ?? true;
					if (entry?.isIntersecting && speed !== 0) {
						startAnimation();
					}
				},
				{ rootMargin: "200px" },
			);
			visibilityObserver.observe(canvas.parentElement ?? canvas);
		}

		startAnimation();

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			resizeObserver?.disconnect();
			visibilityObserver?.disconnect();
			if (glRef.current && programRef.current) {
				glRef.current.deleteProgram(programRef.current);
			}
		};
	}, [width, height, colorBack, colorFront, shape, type, pxSize, speed, pixelRatio, fill]);

	return (
		<div
			className={className}
			style={{
				position: "relative",
				width: fill ? "100%" : width,
				height: fill ? "100%" : height,
				...style,
			}}
		>
			<canvas
				ref={canvasRef}
				style={{
					display: "block",
					width: "100%",
					height: "100%",
				}}
			/>
		</div>
	);
}
