import { create, all } from '../lib/mathjs/14.2.0/math.mjs';
import * as THREE from '../lib/three/0.172.0/three.module.js';
import { OrbitControls } from '../lib/three/0.172.0/examples/jsm/controls/OrbitControls.js';
import * as PointsOnNSphere from './points-on-n-sphere.js?v=7299d83';
// we can't import noUiSlider in this way. ChatGPT: "noUiSlider’s distribution has been stuck in UMD-only for years — it never added a proper ESM export"

const math = create(all);

// Three.js scene variables
let scene, camera, renderer, controls;
let pointsGeometry, pointsMaterial, pointsMesh;
let targetMeshes = [];
let targets = [];
let initialCameraPosition, initialCameraTarget;

// MathJS system variables (from 2D version)
const SPHERE_RADIUS = 500;
const VERTEX_RADIUS = 8;
const VERBOSE = false;
const CHUNK_SIZE = 10000;
let isDragging = false;
let draggedVertexIndex = -1;

// Store user control values
const slidersValuesCache = new Map();
const sliderDefaults = new Map();

function getRandomVisiblePoint() {
    const x = (Math.random() - 0.5) * SPHERE_RADIUS;
    const y = (Math.random() - 0.5) * SPHERE_RADIUS;
    const z = (Math.random() - 0.5) * SPHERE_RADIUS;
    return math.matrix([[x, y, z]]);
}

// Initialize Three.js scene
function initThreeJS() {
  const container = document.getElementById('threejs-container');

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Camera setup
  camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 10000);
  camera.position.set(100, 300, 800);
  camera.up.set(0, 0, 1); // Set Z as the up direction for mathematical-style visualization

  // Renderer setup
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: false
  });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 1.0;
  controls.minDistance = 5;
  controls.maxDistance = 4000;

  controls.target.set(0, 0, 0);

  // Store initial camera position and target for reset functionality
  initialCameraPosition = camera.position.clone();
  initialCameraTarget = controls.target.clone();

  // Add coordinate axes helper
  const axesHelper = new THREE.AxesHelper(SPHERE_RADIUS + 50);
  scene.add(axesHelper);

  // Handle window resize
  window.addEventListener('resize', onWindowResize);

  animate();
}

function onWindowResize() {
  const container = document.getElementById('threejs-container');
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.offsetWidth, container.offsetHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Function to create a user control (from 2D version)
function createUserControl(label, min, max, defaultValue, clearPointsWhenChanged = true, options = {}) {
console.log(options);
  const container = document.createElement('div');
  container.className = 'slider';

  const labelContainer = document.createElement('div');
  labelContainer.className = 'label-container';

  const labelElem = document.createElement('label');
  labelElem.textContent = label + ': \u00A0\u00A0\u00A0';
  labelContainer.appendChild(labelElem);
  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'value-display';
  labelContainer.appendChild(valueDisplay);

  container.appendChild(labelContainer);

  const slider = document.createElement('div');
  container.appendChild(slider);

  sliderDefaults.set(label, defaultValue);

  const decimals = (options.step && options.step >= 1) ? 0 : 2;

  noUiSlider.create(slider, {
    start: defaultValue,
    connect: true,
    range: {'min': min, 'max': max},
    step: 0.01,
    ...options
  });

  // Check for value from Share link and update if exists
  if (window.sharedSliderValues && window.sharedSliderValues[label] !== undefined) {
    slider.noUiSlider.set(window.sharedSliderValues[label]);
  }

  slidersValuesCache.set(label, slider.noUiSlider.get());
  valueDisplay.innerHTML = '<big>' + parseFloat(defaultValue).toFixed(decimals) + '</big>';

  slider.noUiSlider.on('update', function(values) {
    const newValue = parseFloat(values[0]);
    const oldValue = slidersValuesCache.get(label);
    if (newValue !== oldValue) {
      slidersValuesCache.set(label, newValue);
      valueDisplay.innerHTML = '<big>' + newValue.toFixed(decimals) + '</big>';
      updateResetButtonVisibility();
      // now we start a new generation of drawing. this is how we get 'live' control from a slide -- the slider is live, but the old generation is not.
      if (clearPointsWhenChanged) {
        clearTimeout(generateAndDraw.regenerateTimeout);
        generateAndDraw.regenerateTimeout = setTimeout(() => generateAndDraw(true), 200);
      } else {
        clearTimeout(generateAndDraw.regenerateTimeout);
        generateAndDraw.regenerateTimeout = setTimeout(() => generateAndDraw(false), 200);
      }
    }
  });

  return container;
}

function resetAllSliders() {
    for (const [label, defaultValue] of sliderDefaults.entries()) {
        const sliderElements = document.querySelectorAll('.slider');
        for (const sliderContainer of sliderElements) {
            const labelElem = sliderContainer.querySelector('label');
            if (labelElem && labelElem.textContent.startsWith(label + ':')) {
                const divs = sliderContainer.querySelectorAll('div');
                for (const div of divs) {
                    if (div.noUiSlider) {
                        div.noUiSlider.set(defaultValue);
                        break;
                    }
                }
                break;
            }
        }
    }
}

function updateResetButtonVisibility() {
    const allAtDefaults = Array.from(sliderDefaults.entries()).every(([label, defaultValue]) => {
        const currentValue = slidersValuesCache.get(label);
        return currentValue === undefined || Math.abs(currentValue - defaultValue) < 0.001;
    });

    const resetBtn = document.getElementById('resetSlidersBtn');
    if (resetBtn) {
        resetBtn.style.display = allAtDefaults ? 'none' : 'inline-block';
    }
}

function handleMathJSExpressionsError(error) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.innerHTML = `<span>${error.name}: ${error.message}.<br/><br/><i>for details, enable debug mode and try again</i></span>`;
  throw error;
}


function hasKey(obj, key) {
  const type = obj === null ? 'null' : typeof obj;
  const className = (obj && obj.constructor && obj.constructor.name) || type;

  const valueStr = (
    obj === null || obj === undefined
      ? ', i.e. nothing'
      : ', ' + math.format(obj)
  );

  if (
    typeof obj !== 'object' ||
    obj === null ||
    Object.getPrototypeOf(obj) !== Object.prototype
  ) {
    throw new Error(
      `First argument to hasKey() must be a plain Object, like {"foo": 123}, instead got a ${className}${valueStr}.`
    );
  }

  try {
    void obj[key];
  } catch (e) {
    throw new Error(`Key "${math.format(key)}" is not usable as a property key: ${e.message}`);
  }

  return key in obj;
}

let writeToDOMDiv = null;
let writeToDOMLastOutput = [];
let writeToDOMCurrentOutput = [];
let writeToDOMRepetitionCount = 1;

function writeToDOM(...args) {
  if (!writeToDOMDiv) {
    writeToDOMDiv = document.createElement('div');
    writeToDOMDiv.style.cssText = 'background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; white-space: pre-wrap;';
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.parentNode.insertBefore(writeToDOMDiv, errorDiv);
  }

  const text = args.map(arg => String(arg)).join(' ');

  const writeToDOMTextNode = document.createTextNode(text + '\n');
  writeToDOMDiv.appendChild(writeToDOMTextNode);
  writeToDOMCurrentOutput.push(text);
  return "write: " + text
}

function resetTargetsLocations(verticesCount) {
  //console.log('    unitSphereTargets:', unitSphereTargets, '  typeof unitSphereTargets:', typeof unitSphereTargets);
  targets = PointsOnNSphere.getEquidistantPointsOnNSphere(3, verticesCount);
  targets = targets.map(function(inner_array) {return inner_array.map(function (scalar) {return scalar * SPHERE_RADIUS;}) } );
}

function setVerticesCount(verticesCount) {
  resetTargetsLocations(verticesCount);
  createTargetMeshes();
  const verticesInput = document.getElementById('vertices');
  verticesInput.value = verticesCount;
  verticesInput.dispatchEvent(new Event('input', { bubbles: true }));
  return verticesCount;
}

function createTargetMeshes() {
  // Remove old vertex spheres
  targetMeshes.forEach(vertex => {
    scene.remove(vertex);
  });
  targetMeshes = [];
  targets.forEach(target => {
    const geometry = new THREE.SphereGeometry(4);
    const material = new THREE.MeshPhongMaterial({ color: 0x4285F4 });
    const vertexMesh = new THREE.Mesh(geometry, material);
    vertexMesh.position.set(target[0], target[1], target[2]);
    scene.add(vertexMesh);
    targetMeshes.push(vertexMesh);
  });

  // Add lighting for the spheres
  if (!scene.getObjectByName('ambient-light')) {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    ambientLight.name = 'ambient-light';
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.name = 'directional-light';
    scene.add(directionalLight);
  }
}

function highlightErrorCharacter(expression, error) {
  let highlightedExpression = expression;
  const charMatch = error.message.match(/\(char (\d+)\)/);
  if (charMatch) {
    const charPos = parseInt(charMatch[1]) - 1;
    if (charPos === expression.length) {
      highlightedExpression = expression +
        '<span class="error-highlight"> </span>';
    } else {
      highlightedExpression = expression.slice(0, charPos) +
        '<span class="error-highlight">' +
        expression[charPos] +
        '</span>' +
        expression.slice(charPos + 1);
    }
  }
  return highlightedExpression;
}

let currentGenerationId = 0;
function generatePoints(debugMode, consumePoints) {
  const generationId = ++currentGenerationId;

  const nextVertexAndPointMathJSCodeString = document.getElementById("nextVertexAndPointMathJSCode").value;

  if (!generateAndDraw.regenerateTimeout && nextVertexAndPointMathJSCodeString !== generateAndDraw.lastCode) {
    const sliders = document.getElementById('sliders');
    sliders.innerHTML = '';
    slidersValuesCache.clear();
    generateAndDraw.lastCode = nextVertexAndPointMathJSCodeString;
  }

  const initializationMathJSCodeString = document.getElementById("initializationMathJSCode").value;
  const initializationMathJSCodeLines = initializationMathJSCodeString.split('\n');
  const initializationCompiledExpressions = debugMode ? null : (() => { try { return math.compile(initializationMathJSCodeString); } catch (error) { handleMathJSExpressionsError(error); } })()

  const nextVertexAndPointMathJSCodeLines = nextVertexAndPointMathJSCodeString.split('\n');
  const compiledExpressions = debugMode ? null : (() => { try { return math.compile(nextVertexAndPointMathJSCodeString); } catch (error) { handleMathJSExpressionsError(error); } })();

  let currentStep = 0;

  const scope = {
    math: math,
    currentPoint: getRandomVisiblePoint(),  // the default init code currently overrides this.
    currentPointColor: math.matrix([255, 255, 255]),
    hasKey: hasKey,
    write: writeToDOM,
    createSlider: function(label, min, max, defaultValue, options = {}) {
      // Backward compatibility: if options is a boolean, convert it
      if (typeof options === 'boolean') {
        options = {clearPointsWhenChanged: options};
      }

      const clearPointsWhenChanged = options.clearPointsWhenChanged !== undefined
        ? options.clearPointsWhenChanged
        : true;

      // Extract clearPointsWhenChanged from options for noUISlider
      const {clearPointsWhenChanged: _, ...sliderOptions} = options;

      const sliders = document.getElementById('sliders');
      if (!slidersValuesCache.has(label)) {
        VERBOSE && console.log(`This control does not exist yet, creating it now: "${label}" (${min} to ${max}, default: ${defaultValue})`);
        const control = createUserControl(label, min, max, defaultValue, clearPointsWhenChanged, sliderOptions);
        sliders.appendChild(control);
      }
      return slidersValuesCache.get(label); // this is the only place where the value of a slider becomes available to the MathJS code
    },
    setPointsCount: function(numPoints) {
      const stepsInput = document.getElementById('steps');
      stepsInput.value = numPoints;
      stepsInput.dispatchEvent(new Event('input', { bubbles: true }));
      return numPoints;
    },
    getPointsCount: function() {
      return parseInt(document.getElementById('steps').value);
    },
    setOpacity: function(alphaValue) {
      const alphaInput = document.getElementById('alpha');
      alphaInput.value = alphaValue;
      alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
      return alphaValue;
    },
    getOpacity: function() {
      return parseFloat(document.getElementById('alpha').value);
    }
  };

  scope['setTargetsCount'] = function(numVertices, force=false) {
    if (targets.length !== numVertices || force) {
      setVerticesCount(numVertices)
      const regularArrays = targets.map(target => Array.from(target));
      scope['targetPoints'] = math.matrix(regularArrays);
      scope['targetPointsLength'] = targets.length;
    }
  }
  scope['getTargetsCount'] = function() {
    return targets.length;
  }
  scope['getEquidistantPointsOnSphere'] = function(count, dimensions=3) {
    const points = PointsOnNSphere.getEquidistantPointsOnNSphere(dimensions, count);
    const regularArrays = points.map(point => Array.from(point));
    return math.matrix(regularArrays);
  }
  const vertices = parseInt(document.getElementById('vertices').value);
  scope['setTargetsCount'](vertices, true) // set scope.targetPoints and scope.targetPointsLength initially

  let showStuff = null;
  let firstTime = true;

  // Execute initialization code once per generation
  if (initializationMathJSCodeString.trim()) {
    if (!debugMode) {
      try {
        initializationCompiledExpressions.evaluate(scope);
      } catch (error) { handleMathJSExpressionsError(error); }
    } else {
      for (const [index, expression] of initializationMathJSCodeLines.entries()) {
        if (expression.trim()) {
          try {
            math.evaluate(expression, scope);
          } catch (error) {
            const errorDiv = document.getElementById('errorMessage');
            const highlightedExpression = highlightErrorCharacter(expression, error);
            errorDiv.innerHTML = `
              <span>Error in initialization code at line ${index+1}:</span>
              <pre class="error-message">${highlightedExpression}</pre>
              <span>${error.name}: ${error.message}</span>
              <pre class="error-stack">${error.stack}</pre>`;
            throw error;
          }
        }
      }
    }
  }

  const steps = parseInt(document.getElementById('steps').value);
  const alphaValue = parseFloat(document.getElementById('alpha').value);

  return new Promise((resolve, reject) => {
    function generateChunk() {
      if (generationId !== currentGenerationId) {
        reject(new Error('Generation cancelled'));
        return;
      }
      let points = [];
      const endStep = Math.min(currentStep + CHUNK_SIZE, steps);
      for (let i = currentStep; i < endStep; i++) {
        let currentPointArray = null;
        writeToDOMCurrentOutput = [];
        showStuff = (VERBOSE && (firstTime || (i % 1000000 == 0)));
        //if (scope.currentPoint === undefined) {
        //  scope.currentPoint = getRandomVisiblePoint();  // TODO: remove this and instead put this on the scope when we create the scope object. then, if the user sets it to somehting in the init code, great.
        //}
        if (showStuff) {
          console.log("i:", i);
          console.log("currentPoint:", scope.currentPoint);
        }
        currentPointArray = scope.currentPoint.toArray();
        if (currentPointArray.length === 1) {
            // assume this is a nested array, like [[100, 200, 44]]
            currentPointArray = currentPointArray[0];
        }
        if (showStuff) {
            //console.log("pushing currentPointArray:", currentPointArray);
            if (currentPointArray.length != 3) console.log("(currentPointArray.length != 3)  currentPointArray:", currentPointArray);
        }
        const rawColor = scope.nextPointColor !== undefined ? scope.nextPointColor : scope.currentPointColor; // point color remains set across iterations by default
        points.push({
            position: currentPointArray,
            color: rawColor
        });


        let resultSet = null;
        if (!debugMode) {
          try {
            resultSet = compiledExpressions.evaluate(scope);
          } catch (error) { handleMathJSExpressionsError(error); }
        } else {
          for (const [index, expression] of nextVertexAndPointMathJSCodeLines.entries()) {
            try {
              math.evaluate(expression, scope);
            } catch (error) {
              const errorDiv = document.getElementById('errorMessage');
              const highlightedExpression = highlightErrorCharacter(expression, error);
              errorDiv.innerHTML = `
                <span>Error in the 'Code to calculate the next point' at line ${index+1}:</span>
                <pre class="error-message">${highlightedExpression}</pre>
                <span>${error.name}: ${error.message}</span>
                <pre class="error-stack">${error.stack}</pre>`;
              throw error;
            }
          }
        }
        if (showStuff) {
          console.log("resultSet:", resultSet);
        }

        // Update currentPoint from nextPoint for next iteration
        if (scope.nextPoint !== undefined) {
          scope.currentPoint = scope.nextPoint;
          scope.nextPoint = undefined;
        }

        if (scope.nextPointColor !== undefined) {
          scope.currentPointColor = scope.nextPointColor;
          scope.nextPointColor = undefined;
        }

        // Handle write() output repetition logic (from 2D version)
        if (writeToDOMCurrentOutput.length > 0 &&
            writeToDOMCurrentOutput.length === writeToDOMLastOutput.length &&
            writeToDOMCurrentOutput.every((val, idx) => val === writeToDOMLastOutput[idx])) {
          if (writeToDOMDiv) {
            const lines = writeToDOMDiv.childNodes;
            for (let j = 0; j < writeToDOMCurrentOutput.length; j++) {
              if (lines.length > 0) {
                writeToDOMDiv.removeChild(lines[lines.length - 1]);
              }
            }
            if (writeToDOMRepetitionCount > 1) {
              if (lines.length > 0) {
                writeToDOMDiv.removeChild(lines[lines.length - 1]);
              }
            }
            writeToDOMRepetitionCount++;
            const countNode = document.createElement('i');
            if (writeToDOMLastOutput.length === 1) {
              countNode.textContent = `(repeated "${writeToDOMLastOutput[0]}" x ${writeToDOMRepetitionCount})\n`;
            } else {
              const statementsText = writeToDOMLastOutput.map(s => s).join('\n');
              countNode.textContent = `(repeated ${writeToDOMLastOutput.length} writes:\n${statementsText}\nx ${writeToDOMRepetitionCount})\n`;
            }
            writeToDOMDiv.appendChild(countNode);
          }
        } else {
          writeToDOMRepetitionCount = 1;
          writeToDOMLastOutput = [...writeToDOMCurrentOutput];
        }

        firstTime = false;
      }

      currentStep = endStep;
      consumePoints(currentStep / steps, points);
      points = [];

      if (currentStep < steps) {
        setTimeout(generateChunk, 0);
      } else {
        resolve(points);
      }
    }

    generateChunk();
  });
}


// A global or module-level variable to store the default alpha value
//const defaultAlpha = 0.5;

const clamp255i = x => (x <= 0 ? 0 : (x >= 255 ? 255 : x|0)); // clamp. "x|0" is Bitwise-OR with 0, JS idiom for truncating a number to a 32-bit signed integer

// pack (r,g,b,aByte) into a single signed 32-bit int: a in top 8 bits
const packRGBA = (r, g, b, aByte) => ((aByte & 255) << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);

// unpack back out
const unpackRGBA = k => ({
  aByte: (k >>> 24) & 255,
  r:     (k >>> 16) & 255,
  g:     (k >>> 8)  & 255,
  b:     (k)        & 255
});

/* This function gained, in commit ffc3d34, a important opt for the end user -- clamped colors to 0 thru 255, ints only. This greatly reduced mesh count for some MathJS code. But also ChatGPT did a lot of general opt which appears to have done nothing in the usual case, see "... No noticeable speedup in this https://tinyurl.com/43b4wn2j" in that commit's msg. So be aware that simplifying this function should always be on the table. Details: https://github.com/herdrick/chaos-game/issues/83 */
function drawPoints3D(pointsData, defaultAlpha) {
  const groups = new Map();

  for (let i = 0; i < pointsData.length; i++) {
    const raw = pointsData[i].color.toArray();

    let r, g, b, a;
    if (Array.isArray(raw[0])) {
      const row = raw[0];
      r = clamp255i(row[0] ?? 0); // if this is a 0D point, then x=0  :)
      g = clamp255i(row[1] ?? 0); // if this is a 1D point, then y=0
      b = clamp255i(row[2] ?? 0); // if this is a 2D point, then z=0
      a = row[3];
    } else {
      r = clamp255i(raw[0] ?? 0);
      g = clamp255i(raw[1] ?? 0);
      b = clamp255i(raw[2] ?? 0);
      a = raw[3];
    }
    const alpha = (a === undefined ? defaultAlpha : a);
    const aByte = (alpha <= 0 ? 0 : (alpha >= 1 ? 255 : (alpha * 255 + 0.5) | 0));

    const key = packRGBA(r, g, b, aByte);
    let bucket = groups.get(key);
    if (bucket === undefined) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(pointsData[i]);
  }

  // Build one mesh per group key
  for (const [key, group] of groups) {
    const { r, g, b, aByte } = unpackRGBA(key);
    const alphaFloat = aByte / 255;
    if (alphaFloat === 0) continue;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(group.length * 3);
    for (let i = 0; i < group.length; i++) {
      const p = group[i].position;
      const idx = i * 3;
      positions[idx]     = p[0];
      positions[idx + 1] = p[1];
      positions[idx + 2] = p[2];
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: false,
      transparent: aByte < 255,
      color: new THREE.Color(r/255, g/255, b/255),
      opacity: alphaFloat,
      sizeAttenuation: false
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
  }
}



function toggleProgressIndicator(show) {
  const progressIndicator = document.getElementById('progress-indicator');
  progressIndicator.style.display = show ? 'block' : 'none';
}

async function generateAndDraw(clearPoints = true) {
  const generationId = currentGenerationId + 1;
  const vertices = parseInt(document.getElementById('vertices').value);
  const steps = parseInt(document.getElementById('steps').value);
  const alphaValue = parseFloat(document.getElementById('alpha').value);
  const debugMode = document.getElementById('debugMode').checked;

  // Clear the write() log
  if (writeToDOMDiv) {
    writeToDOMDiv.innerHTML = '';
  }
  writeToDOMLastOutput = [];
  writeToDOMCurrentOutput = [];
  writeToDOMRepetitionCount = 1;

  // Clear any previous error message
  document.getElementById('errorMessage').innerHTML = '';

  // Hide generate buttons and show stop button
  document.getElementById('generateBtn').style.visibility = 'hidden';
  document.getElementById('generateAddBtn').style.visibility = 'hidden';
  document.getElementById('stopBtn').style.display = 'inline-block';

  try {

    // Clear existing points only if requested
    if (clearPoints) {
      // Clear the entire scene of points
      scene.children.filter(child => child instanceof THREE.Points).forEach(points => {
        scene.remove(points);
        if (points.geometry) points.geometry.dispose();
        if (points.material) points.material.dispose();
      });
      // Also clear the canvas buffer
      renderer.clear();
    }

    await new Promise(resolve => setTimeout(resolve, 5));

    toggleProgressIndicator(true);

    try {
      // TODO: consider putting the progress indicator thing in drawPoints3D() to simplify this call to generatePoints()
      await generatePoints(debugMode, (progress, points) => {
        document.getElementById('progress-indicator').textContent =
          `Generating points... ${Math.round(progress * 100)}%`;
        drawPoints3D(points, alphaValue);
      });

      if (document.getElementById('progress-indicator').textContent.includes('100%')) {
        toggleProgressIndicator(false);
      }
    } catch (error) {
      if (error.message !== 'Generation cancelled') {
        toggleProgressIndicator(false);
        throw error;
      }
      return;
    }
  } finally {
    if (generationId === currentGenerationId) {
      document.getElementById('generateBtn').style.visibility = 'visible';
      document.getElementById('generateAddBtn').style.visibility = 'visible';
      document.getElementById('stopBtn').style.display = 'none';
    }
    generateAndDraw.regenerateTimeout = null;
  }
}

// Share functionality (adapted from 2D version)
function generateShareableLink() {
  const initCode = document.getElementById('initializationMathJSCode').value;
  const mainCode = document.getElementById('nextVertexAndPointMathJSCode').value;

  const shareData = {
    initCode: initCode,
    mainCode: mainCode,
    targets: document.getElementById('vertices').value,
    steps: document.getElementById('steps').value,
    alpha: document.getElementById('alpha').value,
    sliders: Object.fromEntries(slidersValuesCache),
    camera: {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
      }
    }
  };

  const encodedData = encodeURIComponent(btoa(JSON.stringify(shareData)));
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?code=${encodedData}`;

  return shareUrl;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

function loadSharedCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedCode = urlParams.get('code');

  if (encodedCode) {
    try {
      const shareData = JSON.parse(atob(encodedCode));

      if (shareData.initCode !== undefined) {
        document.getElementById('initializationMathJSCode').value = shareData.initCode;
      }

      if (shareData.mainCode !== undefined) {
        document.getElementById('nextVertexAndPointMathJSCode').value = shareData.mainCode;
      }

      if (shareData.targets !== undefined) {
        document.getElementById('vertices').value = shareData.targets;
      }

      if (shareData.steps !== undefined) {
        document.getElementById('steps').value = shareData.steps;
      }

      if (shareData.alpha !== undefined) {
        document.getElementById('alpha').value = shareData.alpha;
      }

      if (shareData.sliders) {
        window.sharedSliderValues = shareData.sliders;
      }

      if (shareData.camera) {
        // Restore camera position and target
        if (shareData.camera.position) {
          camera.position.set(
            shareData.camera.position.x,
            shareData.camera.position.y,
            shareData.camera.position.z
          );
        }
        if (shareData.camera.target) {
          controls.target.set(
            shareData.camera.target.x,
            shareData.camera.target.y,
            shareData.camera.target.z
          );
        }
        controls.update();
      }

    } catch (error) {
      console.error('Error loading shared code:', error);
    }
  }
}

// Event listeners
document.getElementById('generateBtn').addEventListener('click', function() {
  generateAndDraw(true);
});

document.getElementById('generateAddBtn').addEventListener('click', function() {
  generateAndDraw(false);
});

document.getElementById('resetSlidersBtn').addEventListener('click', function() {
  resetAllSliders();
  updateResetButtonVisibility();
});

document.getElementById('stopBtn').addEventListener('click', function() {
  // Stop generation by incrementing the generation ID
  currentGenerationId++;
  // Hide the progress indicator
  toggleProgressIndicator(false);
  // Show generate buttons, hide stop button
  document.getElementById('generateBtn').style.visibility = 'visible';
  document.getElementById('generateAddBtn').style.visibility = 'visible';
  document.getElementById('stopBtn').style.display = 'none';
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const shareBtn = document.getElementById('shareBtn');
  const originalText = shareBtn.textContent;

  try {
    const shareUrl = generateShareableLink();
    const success = await copyToClipboard(shareUrl);

    if (success) {
      shareBtn.textContent = 'Link copied!';
      setTimeout(() => {
        shareBtn.textContent = originalText;
      }, 2000);
    } else {
      prompt('Copy this link to share:', shareUrl);
    }
  } catch (error) {
    console.error('Error generating share link:', error);
    shareBtn.textContent = 'Error';
    setTimeout(() => {
      shareBtn.textContent = originalText;
    }, 2000);
  }
});

document.getElementById('resetCameraBtn').addEventListener('click', () => {
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialCameraTarget);
  controls.update();
});

// Initialize everything
initThreeJS();
loadSharedCode();
generateAndDraw();
updateResetButtonVisibility();
