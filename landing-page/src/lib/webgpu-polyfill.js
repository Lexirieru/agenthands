/**
 * Polyfill for GPUShaderStage on browsers without WebGPU.
 *
 * Three.js (WebGPUConstants.js) does:
 *   export const GPUShaderStage = (typeof self !== 'undefined') ? self.GPUShaderStage : { ... };
 *
 * On mobile, `self` exists but `self.GPUShaderStage` is undefined -> crash.
 * This module must be imported BEFORE any import of "three/webgpu" or "three/tsl".
 */
if (typeof self !== "undefined" && !self.GPUShaderStage) {
  self.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
}
