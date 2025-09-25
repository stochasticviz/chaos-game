import { create, all } from '../lib/mathjs/14.2.0/math.mjs';
import * as THREE from '../lib/three/0.172.0/three.module.js';
import { OrbitControls } from '../lib/three/0.172.0/examples/jsm/controls/OrbitControls.js';

const math = create(all);

// Three.js scene variables
let scene, camera, renderer, controls;
let pointsGeometry, pointsMaterial, pointsMesh;
let targetVertices = [];
let targets = [];

// MathJS system variables (from 2D version)
const SPHERE_RADIUS = 500;
const VERTEX_RADIUS = 8;
const VERBOSE = false;
const CHUNK_SIZE = 10000;
let isDragging = false;
let draggedVertexIndex = -1;

// Store user control values
const slidersValuesCache = new Map();

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

  // Renderer setup
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.2;
  controls.minDistance = 50;
  controls.maxDistance = 4000;

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

// Generate target points on sphere (from existing 3D version)
function normalize(point) {
  const norm = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]);
  return new THREE.Vector3(point[0] / norm, point[1] / norm, point[2] / norm);
}

function tetrahedron() {
  const points = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1]
  ];
  return points.map(normalize);
}

function octahedron() {
  const points = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1]
  ];
  return points.map(normalize);
}

function cube() {
  const points = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ];
  return points.map(normalize);
}

function icosahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const points = [
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]
  ];
  return points.map(normalize);
}

function dodecahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const points = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, 1/phi, phi], [0, 1/phi, -phi], [0, -1/phi, phi], [0, -1/phi, -phi],
    [1/phi, phi, 0], [1/phi, -phi, 0], [-1/phi, phi, 0], [-1/phi, -phi, 0],
    [phi, 0, 1/phi], [phi, 0, -1/phi], [-phi, 0, 1/phi], [-phi, 0, -1/phi]
  ];
  return points.map(normalize);
}

function getEquidistantPointsOnUnitSphereApproximation(n) {
  const points = [];
  const offset = 2 / n;
  const increment = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;

    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;

    points.push([x, y, z]);
  }

  return points.map(normalize);
}

function getEquidistantPointsOnSphere(radius, nPoints) {
  let points = [];

  if (nPoints === 4) points = tetrahedron();
  else if (nPoints === 6) points = octahedron();
  else if (nPoints === 8) points = cube();
  else if (nPoints === 12) points = icosahedron();
  else if (nPoints === 20) points = dodecahedron();
  else {
    points = getEquidistantPointsOnUnitSphereApproximation(nPoints);
  }

  return points.map(p => new THREE.Vector3(
    p.x * radius,
    p.y * radius,
    p.z * radius
  ));
}

// MathJS integration functions (adapted from 2D version)
document.getElementById('customizeMathJSCode').addEventListener('change', function(e) {
  const mainCodeLabel = document.querySelector('label[for="nextVertexAndPointMathJSCode"]');
  const mainCodeInput = document.getElementById('nextVertexAndPointMathJSCode');
  const explanation = document.getElementById('codeExplanation');
  const debugModeDiv = document.getElementById('debugModeDiv');
  mainCodeLabel.style.display = e.target.checked ? 'block' : 'none';
  mainCodeInput.style.display = e.target.checked ? 'block' : 'none';
  explanation.style.display = e.target.checked ? 'block' : 'none';
  debugModeDiv.style.display = e.target.checked ? 'block' : 'none';
});

// Function to create a user control (from 2D version)
function createUserControl(label, min, max, defaultValue, clearPointsWhenChanged = true) {
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

  noUiSlider.create(slider, {
    start: defaultValue,
    connect: true,
    range: {'min': min, 'max': max},
    step: 0.01
  });

  slidersValuesCache.set(label, defaultValue);
  valueDisplay.innerHTML = '<big>' + defaultValue.toFixed(2) + '</big>';

  if (window.sharedSliderValues && window.sharedSliderValues[label] !== undefined) {
    const sharedValue = window.sharedSliderValues[label];
    slider.noUiSlider.set(sharedValue);
    slidersValuesCache.set(label, sharedValue);
    valueDisplay.innerHTML = '<big>' + sharedValue.toFixed(2) + '</big>';
  }

  slider.noUiSlider.on('update', function(values) {
    const newValue = parseFloat(values[0]);
    const oldValue = slidersValuesCache.get(label);
    if (newValue !== oldValue) {
      slidersValuesCache.set(label, newValue);
      valueDisplay.innerHTML = '<big>' + newValue.toFixed(2) + '</big>';
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
  targets = getEquidistantPointsOnSphere(SPHERE_RADIUS, verticesCount);
}

function setVerticesCount(verticesCount) {
  resetTargetsLocations(verticesCount);
  const verticesInput = document.getElementById('vertices');
  verticesInput.value = verticesCount;
  verticesInput.dispatchEvent(new Event('input', { bubbles: true }));
  return verticesCount;
}

function createTargetVertices(numVertices) {
  // Remove old vertex spheres
  targetVertices.forEach(vertex => {
    scene.remove(vertex);
  });
  targetVertices = [];

  targets = getEquidistantPointsOnSphere(SPHERE_RADIUS, numVertices);

  targets.forEach(target => {
    const geometry = new THREE.SphereGeometry(4);
    const material = new THREE.MeshPhongMaterial({ color: 0x4285F4 });
    const vertexMesh = new THREE.Mesh(geometry, material);
    vertexMesh.position.set(target.x, target.y, target.z);
    scene.add(vertexMesh);
    targetVertices.push(vertexMesh);
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
  const compiledExpressions = debugMode ? null : (() => { try { return math.compile(nextVertexAndPointMathJSCodeString); } catch (error) { handleMathJSExpressionsError(error); } })()

  let currentStep = 0;

  const scope = {
    math: math,
    targetPoints: math.matrix(targets.map(target => [target.x, target.y, target.z])),
    targetPointsLength: targets.length,
    currentPoint: getRandomVisiblePoint(),
    currentPointColor: math.matrix([255, 255, 255, 1.0]),
    hasKey: hasKey,
    write: writeToDOM,
    createSlider: function(label, min, max, defaultValue, clearPointsWhenChanged = true) {
      const sliders = document.getElementById('sliders');
      if (!slidersValuesCache.has(label)) {
        VERBOSE && console.log(`This control does not exist yet, creating it now: "${label}" (${min} to ${max}, default: ${defaultValue})`);
        const control = createUserControl(label, min, max, defaultValue, clearPointsWhenChanged);
        sliders.appendChild(control);
      }
      return slidersValuesCache.get(label);
    },
    points: function(numPoints) {
      const stepsInput = document.getElementById('steps');
      stepsInput.value = numPoints;
      stepsInput.dispatchEvent(new Event('input', { bubbles: true }));
      return numPoints;
    },
    opacity: function(alphaValue) {
      const alphaInput = document.getElementById('alpha');
      alphaInput.value = alphaValue;
      alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
      return alphaValue;
    }
  };

  scope['targets'] = function(numVertices) {
    if (targets.length !== numVertices) {
      setVerticesCount(numVertices)
      scope['targetPoints'] = math.matrix(targets.map(target => [target.x, target.y, target.z]));
      scope['targetPointsLength'] = targets.length;
    }
  }
  scope['vertices'] = scope['targets']

  let points = [];
  let showStuff = null;
  let firstTime = true;
  let resultSet = null;



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
            errorDiv.innerHTML = `
              <span>Error in initialization code at line ${index+1}:</span>
              <pre class="error-message">${expression}</pre>
              <span>${error.name}: ${error.message}</span>
              <pre class="error-stack">${error.stack}</pre>`;
            throw error;
          }
        }
      }
    }
  }


  const vertices = parseInt(document.getElementById('vertices').value, 10);
  const steps = parseInt(document.getElementById('steps').value, 10);
  const alphaValue = parseFloat(document.getElementById('alpha').value);

  return new Promise((resolve, reject) => {
    function generateChunk() {
      if (generationId !== currentGenerationId) {
        reject(new Error('Generation cancelled'));
        return;
      }

      let currentPointArray = null;
      const endStep = Math.min(currentStep + CHUNK_SIZE, steps);
      for (let i = currentStep; i < endStep; i++) {
        writeToDOMCurrentOutput = [];
        showStuff = (VERBOSE && (firstTime | (i % 1000000 == 0)));

        //if (scope.currentPoint === undefined) {
        //  scope.currentPoint = getRandomVisiblePoint();  // TODO: remove this and instead put this on the scope when we create the scope object. then, if the user sets it to somehting in the init code, great.
        //}
        if (showStuff) {
          console.log("i:", i)
          console.log("currentPoint:", scope.currentPoint);
        }
        currentPointArray = scope.currentPoint.toArray();
        if (currentPointArray.length === 1) {
            // assume this is a nested array, like [[100, 200, 44]]
            currentPointArray = currentPointArray[0];
        }

        const rawColor = scope.nextPointColor !== undefined ? scope.nextPointColor : scope.currentPointColor; // point color remains set across iterations by default
        const pointColor = rawColor;
        if (currentPointArray.length === 3) {
            //
            points.push({
                x: currentPointArray[0],
                y: currentPointArray[1],
                z: currentPointArray[2],
                color: pointColor
            });
          }
            else {
                console.log("(currentPointArray.length === 3) is FALSE!", currentPointArray.length);
}
        });

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
              errorDiv.innerHTML = `
                <span>Error at line ${index+1}:</span>
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

function drawPoints3D(pointsData, defaultAlpha) {
  // group points by their color and alpha
  const pointGroups = new Map();
  pointsData.forEach(point => {
    const colorMatrix = point.color;
    let alpha = null;
    let colorArray = null;
    const colorArrayRaw = colorMatrix.toArray()
    if (Array.isArray(colorArrayRaw[0])) {
        // if colorArrayRaw is ex. [[10, 255, 10, .7]] (or without alpha) then make JS array [10, 255, 10]
        colorArray = colorArrayRaw[0].slice(0, 3)
        alpha = colorArrayRaw[0][3]  // could be undefined
    }
    else {
        //console.log('    first element of colorArrayRaw is NOT an array, ex. [10, 255, 10, .7]') (or without alpha) then ensure we drop the alpha
        colorArray = colorArrayRaw.slice(0, 3)
        alpha = colorArrayRaw[3]  // could be undefined
    }
    if (alpha === undefined) {
        alpha = defaultAlpha;
    }

    const key = `${colorArray.join(',')}-${alpha}`;
    if (!pointGroups.has(key)) {
      pointGroups.set(key, []);
    }
    pointGroups.get(key).push(point);
  });

  // Iterate over each color group and create a single mesh for it
  pointGroups.forEach((group, key) => {
    const [colorPart, alphaFloat] = key.split('-');
    if (alphaFloat == 0.0) {
        // transparent points, don't bother plotting them
        return
    }
    const colorArray = colorPart.split(',').map(Number);
    // Create geometry for this color group
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(group.length * 3);
    const color = new THREE.Color().setRGB(colorArray[0]/255.0, colorArray[1]/255.0, colorArray[2]/255.0)

    group.forEach((point, i) => {
      const idx = i * 3;
      positions[idx] = point.x;
      positions[idx + 1] = point.y;
      positions[idx + 2] = point.z;
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Create material for this color group with alphaFloat
    const material = new THREE.PointsMaterial({
      size: 2,  // TODO: this is size of voxel
      vertexColors: false,
      transparent: alphaFloat < 1.0,  // TODO: set this false when alphaFloat is 1.0
      color: color,
      opacity: alphaFloat,
      sizeAttenuation: false  // TODO: try this with true. it should look better.
    });
    // Create points mesh and add to scene
    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
  });
}


function toggleProgressIndicator(show) {
  const progressIndicator = document.getElementById('progress-indicator');
  progressIndicator.style.display = show ? 'block' : 'none';
}

async function generateAndDraw(clearPoints = true) {
  const generationId = currentGenerationId + 1;
  const vertices = parseInt(document.getElementById('vertices').value, 10);
  const steps = parseInt(document.getElementById('steps').value, 10);
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

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.textContent = 'Stop';

  try {
    if (targets.length !== vertices) {
      setVerticesCount(vertices);
      createTargetVertices(vertices);
    }

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
      generateBtn.textContent = 'Generate';
      generateBtn.disabled = false;
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
    customizeMathJSCode: document.getElementById('customizeMathJSCode').checked,
    debugMode: document.getElementById('debugMode').checked,
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

      if (shareData.customizeMathJSCode !== undefined) {
        document.getElementById('customizeMathJSCode').checked = shareData.customizeMathJSCode;
        document.getElementById('customizeMathJSCode').dispatchEvent(new Event('change'));
      }

      if (shareData.debugMode !== undefined) {
        document.getElementById('debugMode').checked = shareData.debugMode;
        document.getElementById('debugMode').dispatchEvent(new Event('change'));
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
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn.textContent === 'Stop') {
    currentGenerationId++;
    toggleProgressIndicator(false);
    generateBtn.textContent = 'Generate';
  } else {
    generateAndDraw(true);
  }
});

document.getElementById('generateAddBtn').addEventListener('click', function() {
  generateAndDraw(false);
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

// Initialize everything
initThreeJS();
loadSharedCode();
generateAndDraw();
