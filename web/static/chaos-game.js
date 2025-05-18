import { create, all } from '../lib/mathjs/14.2.0/math.mjs';
const math = create(all);

// params
const VERTEX_RADIUS = 8;
const HANDLE_RADIUS = 15;
const CIRCLE_RADIUS = 475;
const VERBOSE = true;

let targets = [];  // TODO: these should probably be MathJS matrices
let isDragging = false;
let draggedVertexIndex = -1;

// Store user control values
const userControlsValuesCache = new Map();

// Canvas setup with transformed context
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
// Transform the context to move origin to center
ctx.translate(canvas.width / 2, canvas.height / 2);
// Flip Y axis so positive is up
ctx.scale(1, -1);

// Register userControl function with MathJS
math.import({
  userControl: function(label, min, max) {
    return userControlsValuesCache.get(label) || (min + max) / 2;
  }
});

document.getElementById('customizeFunction').addEventListener('change', function(e) {
    const functionInput = document.getElementById('nextVertexAndPointMathJSCode');
    const explanation = document.getElementById('codeExplanation');
    functionInput.style.display = e.target.checked ? 'block' : 'none';
    explanation.style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('customizeView').addEventListener('change', function(e) {
    const viewSettings = document.getElementById('viewSettings');
    viewSettings.style.display = e.target.checked ? 'block' : 'none';
});

// Function to create a user control
function createUserControl(label, min, max, defaultValue) {
    const container = document.createElement('div');
    container.className = 'userControl';

    const labelContainer = document.createElement('div');
    labelContainer.className = 'label-container';

    const labelElem = document.createElement('label');
    labelElem.textContent = label + ': ';
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
        range: {
            'min': min,
            'max': max
        }
    });

    // Store the initial value
    userControlsValuesCache.set(label, defaultValue);
    valueDisplay.textContent = defaultValue.toFixed(3);

    // Update value when slider changes
    slider.noUiSlider.on('update', function(values) {
        const newValue = parseFloat(values[0]);
        const oldValue = userControlsValuesCache.get(label);
        if (newValue !== oldValue) {
            userControlsValuesCache.set(label, newValue);
            valueDisplay.textContent = newValue.toFixed(3);
            // Regenerate points when slider changes
            clearTimeout(canvas.regenerateTimeout);
            canvas.regenerateTimeout = setTimeout(generateAndDraw, 200);
        }
    });

    return container;
}

// Function to ensure UI controls exist
function ensureUserControls() {
    const userControls = document.getElementById('userControls');
    if (userControls.children.length === 0) {
        userControls.innerHTML = '';
        userControlsValuesCache.clear();
    }
}

function getCircleCoord(theta) {
  const x = CIRCLE_RADIUS * Math.cos(theta);
  const y = CIRCLE_RADIUS * Math.sin(theta);
  return { x, y };
}

function initializeVertices(n_points) {
  targets = [];
  for (let i = 0; i < n_points; i++) {
    const shift = n_points == 2 ? Math.PI/6 : 0;
    const theta = (i / n_points) * 2 * Math.PI + shift;
    targets.push(getCircleCoord(theta));
  }
}

let currentGenerationId = 0;
function generatePoints(steps, nextVertexAndPointMathJSCodeString, consumePoints) {
  const generationId = ++currentGenerationId;
  // Start near origin
  const centerX = parseFloat(document.getElementById('centerX').value);
  const centerY = parseFloat(document.getElementById('centerY').value);
  const zoom = parseFloat(document.getElementById('zoom').value);
  const viewWidth = canvas.width / zoom;
  const viewHeight = canvas.height / zoom;
  const viewLeft = centerX - viewWidth / 2;
  const viewTop = centerY - viewHeight / 2;

  const chunkSize = 10000;
  let currentStep = 0;

  const scope = {
      math: math,
      targetPoints: math.matrix(targets.map( (pointObj) => { return [pointObj.x, pointObj.y] })),
      targetPointsLength: targets.length,
      // arbitrary index. mathJS uses 1-index.
      currentTargetIndex: 1,
      // arbitary point to start is 100, 100
      currentPoint: math.matrix([[100, 100]]),
      userData: {},
      userControl: function(label, min, max, defaultValue) {
          ensureUserControls();
          const userControls = document.getElementById('userControls');
          if (!userControlsValuesCache.has(label)) {
              VERBOSE && console.log(`This control does not exist yet, creating it now: ${label} (${min} to ${max}, default: ${defaultValue})`);
              const control = createUserControl(label, min, max, defaultValue);
              userControls.appendChild(control);
          }
          return userControlsValuesCache.get(label) || defaultValue;
      }
  };

  const compiled_expressions = math.compile(nextVertexAndPointMathJSCodeString);
  let points = [];
  let pointsInViewCount = 0;
  let nextPoint = null;
  let nextPointArray = null;
  let showStuff = false;
  let firstTime = true;
  let resultSet = null;

  return new Promise((resolve, reject) => {
    function generateChunk() {
      // Check if this generation is still current
      if (generationId !== currentGenerationId) {
        reject(new Error('Generation cancelled'));
        return;
      }

      const endStep = Math.min(currentStep + chunkSize, steps);
      for (let i = currentStep; i < endStep; i++) {
        if (nextVertexAndPointMathJSCodeString) {
            showStuff = (VERBOSE & (firstTime | (i % 100000 == 0)));
            resultSet = compiled_expressions.evaluate(scope);
            if (showStuff) {
                console.log("currentPoint:", scope.currentPoint);
                console.log("nextPoint:", scope.nextPoint);
                console.log("resultSet:", resultSet)
            }
            nextPoint = scope.nextPoint;
            // update the scope for the next iteration
            scope.currentPoint = nextPoint;
            scope.currentTargetIndex = scope.nextTargetIndex;
            firstTime = false;
        } else {
            const nextTargetIdx = Math.floor(Math.random() * targets.length);
            const targetX = targets[nextTargetIdx].x;
            const targetY = targets[nextTargetIdx].y;
            x = (x + targetX) / 2.0;
            y = (y + targetY) / 2.0;
        }
        nextPointArray = nextPoint.toArray()[0];
        points.push({ x: nextPointArray[0], y: nextPointArray[1] });
          if (nextPointArray[0] >= viewLeft && nextPointArray[0] <= viewLeft + viewWidth &&
              nextPointArray[1] >= viewTop && nextPointArray[1] <= viewTop + viewHeight) {
            pointsInViewCount++;
          }
        }
      }

      currentStep = endStep;
      consumePoints(currentStep / steps, points, pointsInViewCount / currentStep);
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

function drawVerticesOnCanvas(ctx) {
    const centerX = parseFloat(document.getElementById('centerX').value);
    const centerY = parseFloat(document.getElementById('centerY').value);
    const zoom = parseFloat(document.getElementById('zoom').value);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);

    targets.forEach((target, i) => {
        // Draw handle
        ctx.beginPath();
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.arc(target.x, target.y, HANDLE_RADIUS / zoom, 0, 2 * Math.PI);
        ctx.fill();

        // Draw vertex
        ctx.beginPath();
        ctx.fillStyle = i === draggedVertexIndex ? '#A2D5F4' : '#4285F4';
        ctx.arc(target.x, target.y, VERTEX_RADIUS / zoom, 0, 2 * Math.PI);
        ctx.fill();
    });
    ctx.restore();
}

function drawPointsOnCanvas(ctx, points, alphaValue) {
  const centerX = parseFloat(document.getElementById('centerX').value);
  const centerY = parseFloat(document.getElementById('centerY').value);
  const zoom = parseFloat(document.getElementById('zoom').value);

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-centerX, -centerY);

  ctx.fillStyle = `rgba(0, 0, 0, ${alphaValue})`;
  for (let i = 0; i < points.length; i++) {
    ctx.fillRect(points[i].x, points[i].y, 1/zoom, 1/zoom);
  }
  ctx.restore();
}

function toggleSpinner(show) {
  const spinner = document.getElementById('spinner');
  spinner.style.display = show ? 'block' : 'none';
}

async function generateAndDraw() {
  const vertices = parseInt(document.getElementById('vertices').value, 10);
  const steps = parseInt(document.getElementById('steps').value, 10);
  const alphaValue = parseFloat(document.getElementById('alpha').value);
  const nextVertexAndPointMathJSCodeString = document.getElementById("nextVertexAndPointMathJSCode").value;

  // Only clear controls if this is a fresh generation (not from slider update)
  // and if the code has changed
  if (!canvas.regenerateTimeout && nextVertexAndPointMathJSCodeString !== canvas.lastCode) {
    const userControls = document.getElementById('userControls');
    userControls.innerHTML = '';
    userControlsValuesCache.clear();
    canvas.lastCode = nextVertexAndPointMathJSCodeString;
  }

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.disabled = true;

  try {
    if (targets.length !== vertices) {
      initializeVertices(vertices);
    }

    // save the current transformation matrix
    ctx.save();
    // use the identity matrix while clearing the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // restore the transform
    ctx.restore();

    drawVerticesOnCanvas(ctx);
    await new Promise(resolve => setTimeout(resolve, 5));

    toggleSpinner(true);
    try {
      await generatePoints(steps, nextVertexAndPointMathJSCodeString, (progress, points, proportionInView) => {
        document.getElementById('spinner').textContent =
          `Generating points... ${Math.round(progress * 100)}%`;
        document.getElementById('pointsInView').textContent = `% of points outside current view: ${(100-proportionInView*100).toFixed(1)}%`;
        drawPointsOnCanvas(ctx, points, alphaValue);
      });
      // Only clear if we completed successfully
      if (document.getElementById('spinner').textContent.includes('100%')) {
        toggleSpinner(false);
        document.getElementById('pointsInView').textContent = '';
      }
    } catch (error) {
      if (error.message !== 'Generation cancelled') {
        throw error;
      }
      // If generation was cancelled, just continue but don't clear the spinner
      return;
    }
  } finally {
    generateBtn.disabled = false;
    // Clear the regenerate timeout flag
    canvas.regenerateTimeout = null;
  }
}

function screenToWorld(screenX, screenY) {
  const centerX = parseFloat(document.getElementById('centerX').value);
  const centerY = parseFloat(document.getElementById('centerY').value);
  const zoom = parseFloat(document.getElementById('zoom').value);

  return {
    x: (screenX - canvas.width/2) / zoom + centerX,
    y: -(screenY - canvas.height/2) / zoom + centerY
  };
}

function getVertexAtPosition(screenX, screenY) {
  const worldPos = screenToWorld(screenX, screenY);

  for (let i = 0; i < targets.length; i++) {
    const dx = targets[i].x - worldPos.x;
    const dy = targets[i].y - worldPos.y;
    if (dx * dx + dy * dy < HANDLE_RADIUS * HANDLE_RADIUS) {
      return i;
    }
  }
  return -1;
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  if (isDragging && draggedVertexIndex !== -1) {
    targets[draggedVertexIndex] = screenToWorld(screenX, screenY);
    const alphaValue = parseFloat(document.getElementById('alpha').value);

    // save the current transformation matrix
    ctx.save();
    // use the identity matrix while clearing the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // restore the transform
    ctx.restore();

    drawVerticesOnCanvas(ctx);

    clearTimeout(canvas.regenerateTimeout);
    canvas.regenerateTimeout = setTimeout(generateAndDraw, 100);
  } else {
    const hoveredIndex = getVertexAtPosition(screenX, screenY);
    canvas.style.cursor = hoveredIndex !== -1 ? 'move' : 'default';
  }
}

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  draggedVertexIndex = getVertexAtPosition(x, y);
  if (draggedVertexIndex !== -1) {
    isDragging = true;
    canvas.classList.add('dragging');
  }
}

function handleMouseUp() {
  isDragging = false;
  draggedVertexIndex = -1;
  canvas.classList.remove('dragging');
}

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp);

document.getElementById('generateBtn').addEventListener('click', generateAndDraw);
document.getElementById('resetBtn').addEventListener('click', () => {
  const vertices = parseInt(document.getElementById('vertices').value, 10);
  initializeVertices(vertices);

  // save the current transformation matrix
  ctx.save();
  // use the identity matrix while clearing the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // restore the transform
  ctx.restore();

  drawVerticesOnCanvas(ctx);
});

generateAndDraw();
