export const baseVertexShader = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexelSize;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(uTexelSize.x, 0.0);
    vR = vUv + vec2(uTexelSize.x, 0.0);
    vT = vUv + vec2(0.0, uTexelSize.y);
    vB = vUv - vec2(0.0, uTexelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const clearShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uValue;

void main () {
    fragColor = uValue * texture(uTexture, vUv);
}
`;

export const splatShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

void main () {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
    vec3 base = texture(uTarget, vUv).xyz;
    fragColor = vec4(base + splat, 1.0);
}
`;

export const advectionShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

void main () {
    vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
    vec4 result = texture(uSource, coord);
    float decay = 1.0 + uDissipation * uDt;
    fragColor = result / decay;
}
`;

export const divergenceShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).x;
    float R = texture(uVelocity, vR).x;
    float T = texture(uVelocity, vT).y;
    float B = texture(uVelocity, vB).y;

    vec2 C = texture(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

export const curlShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).y;
    float R = texture(uVelocity, vR).y;
    float T = texture(uVelocity, vT).x;
    float B = texture(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

export const vorticityShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlValue;
uniform float uDt;

void main () {
    float L = texture(uCurl, vL).x;
    float R = texture(uCurl, vR).x;
    float T = texture(uCurl, vT).x;
    float B = texture(uCurl, vB).x;
    float C = texture(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    float l = length(force) + 0.0001;
    force /= l;
    force *= uCurlValue * C;
    force.y *= -1.0;

    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity += force * uDt;
    velocity = clamp(velocity, -1000.0, 1000.0);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

export const pressureShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float divergence = texture(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

export const gradientSubtractShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

export const bloomPrefilterShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uThreshold;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    if (br <= uThreshold) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float soft = clamp(br - uThreshold + 0.1, 0.0, 0.2);
    soft = soft * soft * 2.5;
    float contribution = max(br - uThreshold, soft) / max(br, 0.00001);
    fragColor = vec4(c * contribution, 1.0);
}
`;

export const bloomBlurShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;

void main () {
    vec4 sum = vec4(0.0);
    sum += texture(uTexture, vUv - uTexelSize * 2.0) * 0.06136;
    sum += texture(uTexture, vUv - uTexelSize) * 0.24477;
    sum += texture(uTexture, vUv) * 0.38774;
    sum += texture(uTexture, vUv + uTexelSize) * 0.24477;
    sum += texture(uTexture, vUv + uTexelSize * 2.0) * 0.06136;
    fragColor = sum;
}
`;

export const displayShader = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform vec2 uTexelSize;
uniform float uBloomIntensity;
uniform bool uShading;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;

    if (uShading && length(c) > 0.002) {
        float lc = length(texture(uTexture, vL).rgb);
        float rc = length(texture(uTexture, vR).rgb);
        float tc = length(texture(uTexture, vT).rgb);
        float bc = length(texture(uTexture, vB).rgb);

        vec3 dx = vec3(uTexelSize.x, 0.0, (rc - lc) * 0.5);
        vec3 dy = vec3(0.0, uTexelSize.y, (tc - bc) * 0.5);
        vec3 normal = normalize(cross(dx, dy));
        vec3 lightDir = normalize(vec3(0.2, 0.5, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);
        c += diffuse * 0.12 * min(length(c) * 5.0, 1.0);
    }

    if (uBloomIntensity > 0.0) {
        vec3 bloom = texture(uBloom, vUv).rgb;
        c += bloom * uBloomIntensity;
    }

    // High Dynamic Range Tone Mapping & Gamma Correction
    c = c / (1.0 + c * 0.3);
    c = pow(c, vec3(1.0 / 2.2));

    fragColor = vec4(c, 1.0);
}
`;
