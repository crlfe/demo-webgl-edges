/**
 * @file Demonstration of getUserMedia, WebGL, and edge detection
 * @author Chris Wolfe
 * @license Apache-2.0
 */

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  uniform vec2 uSteps;
  attribute vec2 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vSampleCoords[4];

  void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vSampleCoords[0] = aTexCoord + vec2(uSteps.x, 0);
    vSampleCoords[1] = aTexCoord - vec2(uSteps.x, 0);
    vSampleCoords[2] = aTexCoord + vec2(0, uSteps.y);
    vSampleCoords[3] = aTexCoord - vec2(0, uSteps.y);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform sampler2D uSampler;
  varying vec2 vSampleCoords[4];

  void main(void) {
    vec4 p0 = texture2D(uSampler, vSampleCoords[0]);
    vec4 p1 = texture2D(uSampler, vSampleCoords[1]);
    vec4 p2 = texture2D(uSampler, vSampleCoords[2]);
    vec4 p3 = texture2D(uSampler, vSampleCoords[3]);

    vec4 color = abs(p1 - p0) + abs(p2 - p3);
    float value = 1.0 - max(max(color.r, color.g), color.b);
    gl_FragColor = vec4(value, value, value, 1.0);
  }
`;

// Display unhandled errors on both page and console.
window.addEventListener("error", event => reportError(event.error), true);

main();

// Displays an error in the page and logs it to console.
function reportError(error) {
  console.error(error);

  const reporter = document.createElement("p");
  reporter.setAttribute("class", "error");
  if (typeof error.stack === "string" && error.stack.startsWith("Error:")) {
    // Use the stack trace if it looks human-readable (like Chrome).
    reporter.textContent = error.stack;
  } else {
    // Otherwise, use the standard format without a stack trace.
    reporter.textContent = error.toString();
  }

  const canvas = document.getElementById("display");
  canvas.parentNode.insertBefore(reporter, canvas);
}

function main() {
  const canvas = document.getElementById("display");
  const gl = canvas.getContext("webgl");

  const video = document.createElement("video");
  startVideoCapture(video).catch(reportError);

  // Variables used to store graphics state.
  let program;
  let programInfo;
  let vertices;
  let videoTexture;
  let animationFrameId;

  // The WebGL graphics context may be lost at any moment. If we handle the
  // webglcontextlost event, the browser may restore the context later and let
  // us start rendering again.
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  canvas.addEventListener("webglcontextrestored", onContextRestored, false);

  start();

  // When enabled, this block simulates context loss and restoration, which
  // helps shake out bugs in handling those usually-rare events.
  if (false) {
    const fakeLoseContext = gl.getExtension("WEBGL_lose_context");
    setInterval(() => {
      fakeLoseContext.loseContext();
      setTimeout(() => fakeLoseContext.restoreContext(), 250);
    }, 971);
  }

  function onContextLost(event) {
    event.preventDefault();
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }

  function onContextRestored() {
    start();
  }

  function start() {
    program = buildProgram(gl);
    programInfo = buildProgramInfo(gl, program);
    vertices = buildVertices(gl);
    videoTexture = buildVideoTexture(gl);
    animationFrameId = window.requestAnimationFrame(paint);
  }

  function paint() {
    animationFrameId = 0;

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

    const code = gl.getError();
    if (code != gl.NO_ERROR) {
      if (!gl.isContextLost()) {
        throw new Error("WebGL Error: " + error);
      }
    }

    animationFrameId = window.requestAnimationFrame(paint);
  }
}

async function startVideoCapture(videoElement) {
  // Suggest a power-of-two resolution to the camera, since that may improve
  // WebGL performance.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1024, height: 512 }
  });
  videoElement.srcObject = stream;
  videoElement.play();
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
    if (!gl.isContextLost()) {
      throw new Error(gl.getProgramInfoLog(program));
    }
  }
  return program;
}

function buildShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (!gl.isContextLost()) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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
