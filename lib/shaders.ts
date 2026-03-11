/**
 * Custom GLSL shaders for Systems Planet
 * Optimized for smooth animations and visual effects
 */

/**
 * Vertex shader for domain slice highlighting
 * Supports smooth color transitions and displacement
 */
export const sliceVertexShader = `
  uniform float uTime;
  uniform float uHoverIntensity;
  uniform vec3 uHoverPosition;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    
    // Subtle displacement on hover
    vec3 newPosition = position;
    float distanceToHover = distance(position, uHoverPosition);
    float displacement = uHoverIntensity * 0.1 * (1.0 - distanceToHover);
    newPosition += normal * displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

/**
 * Fragment shader for domain slices
 * Supports gradient effects and emissive highlights
 */
export const sliceFragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uEmissiveColor;
  uniform float uEmissiveIntensity;
  uniform float uTime;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    // Base color with subtle gradient
    vec3 color = uBaseColor;
    float gradient = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    color = mix(color * 0.8, color, gradient);
    
    // Emissive highlight
    vec3 emissive = uEmissiveColor * uEmissiveIntensity;
    
    // Fresnel effect for edge highlight
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
    vec3 fresnelColor = uBaseColor * fresnel * 0.3;
    
    vec3 finalColor = color + emissive + fresnelColor;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Vertex shader for instanced blocks (Phase 2)
 * Optimized for many instances with per-instance animation
 */
export const blockInstancedVertexShader = `
  uniform float uTime;
  
  attribute vec3 instanceColor;
  attribute float instanceScale;
  attribute float instanceAnimationOffset;
  
  varying vec3 vColor;
  varying vec3 vNormal;
  
  void main() {
    vColor = instanceColor;
    vNormal = normalize(normalMatrix * normal);
    
    // Per-instance animation
    float animTime = uTime + instanceAnimationOffset;
    float pulseScale = 1.0 + sin(animTime * 2.0) * 0.05;
    
    vec3 transformed = position * instanceScale * pulseScale;
    
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
  }
`;

/**
 * Fragment shader for instanced blocks
 */
export const blockInstancedFragmentShader = `
  varying vec3 vColor;
  varying vec3 vNormal;
  
  void main() {
    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    
    vec3 color = vColor * (0.5 + diff * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Shader utilities for common operations
 */
export const shaderUtils = `
  // Smooth step with custom edge sharpness
  float smootherstep(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }
  
  // Rotation matrix
  mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
      c, 0.0, s,
      0.0, 1.0, 0.0,
      -s, 0.0, c
    );
  }
  
  // Noise function for procedural effects
  float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }
`;
