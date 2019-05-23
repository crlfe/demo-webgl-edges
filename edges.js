/**
 * @file Demonstration of getUserMedia, WebGL, and edge detection
 * @author Chris Wolfe
 * @license Apache-2.0
 */

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  attribute vec2 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;

  void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTexCoord = aTexCoord;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform sampler2D uSampler;
  uniform vec2 uSteps;
  varying vec2 vTexCoord;

  vec4 getDeltaX(sampler2D sampler, vec2 coord) {
    return texture2D(sampler, coord + vec2(uSteps.x, 0.0)) -
           texture2D(sampler, coord - vec2(uSteps.x, 0.0));
  }

  vec4 getDeltaY(sampler2D sampler, vec2 coord) {
    return texture2D(sampler, coord + vec2(0, uSteps.y)) -
           texture2D(sampler, coord - vec2(0, uSteps.y));
  }

  vec4 getDelta(sampler2D sampler, vec2 coord) {
    return abs(getDeltaX(sampler, coord)) +
           abs(getDeltaY(sampler, coord));
  }

  void main(void) {
    vec4 color = getDelta(uSampler, vTexCoord);
    float value = 1.0 - max(max(color.r, color.g), color.b);
    gl_FragColor = vec4(value, value, value, 1.0);
  }
`;

main();

function main() {
  const canvas = document.getElementById("main");
  const gl = canvas.getContext("webgl");

  const program = buildProgram(gl);
  const programInfo = buildProgramInfo(gl, program);
  const vertices = buildVertices(gl);
  const videoTexture = buildVideoTexture(gl);

  const video = document.createElement("video");
  let videoReady = false;

  async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
    video.srcObject = stream;
    video.play();
  }
  startVideo().catch(console.error);

  function paint() {
    gl.useProgram(program);
    useVertices(gl, programInfo, vertices);
    useVideoTexture(gl, programInfo, videoTexture);
    gl.uniform2f(programInfo.uSteps, 1.0 / canvas.width, 1.0 / canvas.height);

    if (video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
      );
    }
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    window.requestAnimationFrame(paint);
  }
  window.requestAnimationFrame(paint);
}

function buildProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(
    program,
    buildShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
  );
  gl.attachShader(
    program,
    buildShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function buildShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function buildProgramInfo(gl, program) {
  return {
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aTexCoord: gl.getAttribLocation(program, "aTexCoord"),
    uSampler: gl.getUniformLocation(program, "uSampler"),
    uSteps: gl.getUniformLocation(program, "uSteps")
  };
}

function buildVertices(gl) {
  // Vertex format is POSITION_X, POSITION_Y, TEXCOORD_X, TEXCOORD_Y.
  const data = new Float32Array(
    [].concat(
      [-1.0, -1.0, 0.0, 1.0],
      [1.0, -1.0, 1.0, 1.0],
      [1.0, 1.0, 1.0, 0.0],
      [-1.0, 1.0, 0.0, 0.0]
    )
  );

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return vertices;
}

function useVertices(gl, programInfo, vertices) {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);

  gl.vertexAttribPointer(programInfo.aPosition, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(programInfo.aPosition);

  gl.vertexAttribPointer(programInfo.aTexCoord, 2, gl.FLOAT, false, 16, 8);
  gl.enableVertexAttribArray(programInfo.aTexCoord);
}

function buildVideoTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Initialize the texture to a single black pixel. This avoids errors and
  // confused users during the (hopefully) brief time before the video input
  // starts.
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );
  return texture;
}

function useVideoTexture(gl, programInfo, videoTexture) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  gl.uniform1i(programInfo.uSampler, 0);
}
