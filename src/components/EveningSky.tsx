"use client";

import { BackSide } from "three";

const vertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fragmentShader = `
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  float height = max(direction.y, 0.0);
  vec3 horizon = vec3(0.39, 0.28, 0.31);
  vec3 zenith = vec3(0.025, 0.075, 0.16);
  vec3 color = mix(horizon, zenith, pow(smoothstep(0.0, 0.85, height), 0.42));
  vec3 sunDirection = normalize(vec3(-0.7, 0.09, -0.7));
  float sun = max(dot(direction, sunDirection), 0.0);
  color += vec3(0.32, 0.12, 0.06) * pow(sun, 24.0) * 0.42;
  color += vec3(1.0, 0.58, 0.28) * smoothstep(0.9996, 0.99985, sun) * 0.45;
  float cloud = sin(direction.x * 13.0 + direction.z * 6.0 + height * 90.0);
  cloud *= sin(direction.x * 21.0 - direction.z * 10.0 + height * 110.0);
  color = mix(color, color * 0.81 + vec3(0.02, 0.025, 0.03), smoothstep(0.35, 0.8, cloud) * (1.0 - smoothstep(0.02, 0.32, height)) * 0.35);
  color = mix(vec3(0.14, 0.19, 0.23), color, smoothstep(-0.12, 0.02, direction.y));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export default function EveningSky() {
  return <mesh renderOrder={-100}>
    <sphereGeometry args={[1800, 32, 16]} />
    <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} side={BackSide} depthWrite={false} />
  </mesh>;
}
