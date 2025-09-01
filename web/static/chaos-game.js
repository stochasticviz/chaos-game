import { create, all } from '../lib/mathjs/14.2.0/math.mjs';
const math = create(all);

// params
const VERTEX_RADIUS = 8;
const HANDLE_RADIUS = 15;
const CIRCLE_RADIUS = 475;
const VERBOSE = false;
const CHUNK_SIZE = 10000;
let targets = [];
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
        step: 0.01  // this is coupled to the .toFixed(2) calls, below
    });

    // Store the initial value
    userControlsValuesCache.set(label, defaultValue);
    valueDisplay.innerHTML = '<big>' + defaultValue.toFixed(2) + '</big>';

    // Update value when slider changes
    slider.noUiSlider.on('update', function(values) {
        const newValue = parseFloat(values[0]);
        const oldValue = userControlsValuesCache.get(label);
        if (newValue !== oldValue) {
            userControlsValuesCache.set(label, newValue);
            valueDisplay.innerHTML = '<big>' + newValue.toFixed(2) + '</big>' ;
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

// basic error handling. advanced handling is in the try/catch around "math.evaluate(expression, scope)", below
function handleMathJSExpressionsError(error) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerHTML = `<span>${error.name}: ${error.message}.<br/><br/><i>for details, enable debug mode and try again</i></span>`;
    throw error;
}


function hasKey(obj, key) {
  // this may be overkill. just doing a obj[key] in a try catch can let you assume the problem is with the obj, not the key, except in the most obscure situations, which probably aren't even possible in a MathJS expressions context.
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
    void obj[key]; // access to provoke key errors if any
  } catch (e) {
    throw new Error(`Key "${math.format(key)}" is not usable as a property key: ${e.message}`);
  }

  return key in obj;
}

let writeToDOMDiv = null;
let writeToDOMLastOutput = [];
let writeToDOMCurrentOutput = [];
let writeToDOMRepetitionCount = 1;

function writeToDOM(text) {
  if (!writeToDOMDiv) {
    writeToDOMDiv = document.createElement('div');
    writeToDOMDiv.style.cssText = 'background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; white-space: pre-wrap;';
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.parentNode.insertBefore(writeToDOMDiv, errorDiv);
  }
  text = String(text)
  const writeToDOMTextNode = document.createTextNode(text + '\n');
  writeToDOMDiv.appendChild(writeToDOMTextNode);
  writeToDOMCurrentOutput.push(text);
  return "write: " + text
}


function resetTargetsLocations(verticesCount) {
    targets = []; // global
    for (let i = 0; i < verticesCount; i++) {
        const shift = verticesCount == 2 ? Math.PI/6 : 0;
        const theta = (i / verticesCount) * 2 * Math.PI + shift;
        targets.push(getCircleCoord(theta));
    }

}


function setVerticesCount(verticesCount) {
    resetTargetsLocations(verticesCount);
    // update the "Vertices" HTML field
    const verticesInput = document.getElementById('vertices');
    verticesInput.value = verticesCount;
    // Trigger input event to update UI
    verticesInput.dispatchEvent(new Event('input', { bubbles: true }));
    return verticesCount;
}

let currentGenerationId = 0;
function generatePoints(steps, nextVertexAndPointMathJSCodeString, debugMode, consumePoints) {
  const generationId = ++currentGenerationId;

  const initializationMathJSCodeString = document.getElementById("initializationMathJSCode").value;
  const initializationMathJSCodeLines = initializationMathJSCodeString.split('\n');
  const initializationCompiledExpressions = debugMode ? null : (() => { try { return math.compile(initializationMathJSCodeString); } catch (error) { handleMathJSExpressionsError(error); } })()

  const nextVertexAndPointMathJSCodeLines = nextVertexAndPointMathJSCodeString.split('\n');
  const compiledExpressions = debugMode ? null : (() => { try { return math.compile(nextVertexAndPointMathJSCodeString); } catch (error) { handleMathJSExpressionsError(error); } })()
  // Start near origin
  const centerX = parseFloat(document.getElementById('centerX').value);
  const centerY = parseFloat(document.getElementById('centerY').value);
  const zoom = parseFloat(document.getElementById('zoom').value);
  const viewWidth = canvas.width / zoom;
  const viewHeight = canvas.height / zoom;
  const viewLeft = centerX - viewWidth / 2;
  const viewTop = centerY - viewHeight / 2;
  let currentStep = 0;

  const scope = {
      math: math,
      targetPoints: math.matrix(targets.map( (pointObj) => { return [pointObj.x, pointObj.y] })),
      targetPointsLength: targets.length,
      // arbitrary index. mathJS uses 1-index.
      currentTargetIndex: 1,
      // arbitary point to start is 100, 100
      currentPoint: math.matrix([[100, 100]]),
      // Queue for storing multiple points
      pointsQueue: [],
      hasKey: hasKey,
      write: writeToDOM,
      userControl: function(label, min, max, defaultValue) {
          ensureUserControls();
          const userControls = document.getElementById('userControls');
          if (!userControlsValuesCache.has(label)) {
              VERBOSE && console.log(`This control does not exist yet, creating it now: "${label}" (${min} to ${max}, default: ${defaultValue})`);
              const control = createUserControl(label, min, max, defaultValue);
              userControls.appendChild(control);
          }
          return userControlsValuesCache.get(label) || defaultValue;
      },
      zoom: function(zoomLevel) {
          const zoomInput = document.getElementById('zoom');
          zoomInput.value = zoomLevel;
          // Trigger input event to update UI
          zoomInput.dispatchEvent(new Event('input', { bubbles: true }));
          return zoomLevel;
      },
      pan: function(centerX, centerY) {
          if (arguments.length === 1 && centerY === undefined) {
              // Handle single argument case: pan([x, y]) or pan(matrix)
              const point = centerX;
              let x, y;

              if (point && typeof point.toArray === 'function') {
                  // It's a MathJS matrix
                  const arr = point.toArray();
                  if (arr.length === 2) {
                      [centerX, centerY] = arr;
                      console.log('arr.length === 2   1 axis array');
                  } else if (arr.length === 1 && arr[0].length === 2) {
                      // TODO: I think it is always this. Remove the other condition branches.
                      [centerX, centerY] = arr[0];
                  } else {
                      console.log('ERROR!!');
                      throw new Error('pan() matrix argument must be 2D point, got: ' + math.format(point));
                  }
              } else if (Array.isArray(point) && point.length === 2) {
                  // It's a regular Javascript array
                  console.log(' a regular array')
                  [centerX, centerY] = point;
              } else {
                  console.log('  error  !!');
                  throw new Error('pan() single argument must be a 2-element array or 2D matrix, got: ' + math.format(point));
              }
          }
          // Handle two argument case: pan(x, y)
          const centerXInput = document.getElementById('centerX');
          const centerYInput = document.getElementById('centerY');
          centerXInput.value = centerX;
          centerYInput.value = centerY;
          // Trigger input events to update UI
          centerXInput.dispatchEvent(new Event('input', { bubbles: true }));
          centerYInput.dispatchEvent(new Event('input', { bubbles: true }));
          return [centerX, centerY];
      }
  };
  scope['vertices'] = function(numVertices) {
      if (targets.length !== numVertices) {
          setVerticesCount(numVertices)
          scope['targetPoints'] = math.matrix(targets.map( (pointObj) => { return [pointObj.x, pointObj.y] }));
          scope['targetPointsLength'] = targets.length;
      }
  }
  let points = [];
  let pointsInViewCount = 0;
  let nextPoint = null;
  let currentPointsArray = null;
  let showStuff = null;
  let firstTime = true;
  let resultSet = null;

  // Helper function to get a random point well within the currently visible area
  function getRandomVisiblePoint() {
    const x = viewLeft + Math.random() * viewWidth;
    const y = viewTop + Math.random() * viewHeight;
    return math.divide(math.matrix([[x, y]]), 2);
  }

  // Helper function to add points to the queue
  function addPointsToQueue(result) {
    if (!result) return;

    // If result is a matrix, convert to array
    const pointsArray = result.toArray ? result.toArray() : result;

    // If it's a single point (1D array), wrap it
    const points = pointsArray[0] && !Array.isArray(pointsArray[0]) ? [pointsArray] : pointsArray;

    // Add each point as a matrix to the queue
    points.forEach(point => {
      scope.pointsQueue.push(math.matrix([point]));
    });
  }

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

  return new Promise((resolve, reject) => {
    function generateChunk() {
      if (generationId !== currentGenerationId) {
        // this generation is not current, i.e. at least one other generation has been started more recently, so cancel this one
        reject(new Error('Generation cancelled'));
        return;
      }

      const endStep = Math.min(currentStep + CHUNK_SIZE, steps);
      for (let i = currentStep; i < endStep; i++) {
        writeToDOMCurrentOutput = [];  // this is this iteration's logging
        showStuff = (VERBOSE & (firstTime | (i % 1000000 == 0)));
        // If queue is  empty, give it a random point
        if (scope.pointsQueue.length === 0) { scope.pointsQueue.push(getRandomVisiblePoint());  }
        // Get a current point from queue
        scope.currentPoint = scope.pointsQueue.shift();
        if (showStuff) {
            console.log("i:", i)
            console.log("currentPoint:", scope.currentPoint);
        }
        currentPointsArray = scope.currentPoint.toArray();
        // save points to be plotted
        currentPointsArray.forEach(function (currentPointArray, index) {
            points.push({ x: currentPointArray[0], y: currentPointArray[1] });
            if (currentPointArray[0] >= viewLeft && currentPointArray[0] <= viewLeft + viewWidth &&
              currentPointArray[1] >= viewTop && currentPointArray[1] <= viewTop + viewHeight) {
            pointsInViewCount++;
            }
        });

        if (! debugMode) {
            try {
                resultSet = compiledExpressions.evaluate(scope);
            } catch (error) { handleMathJSExpressionsError(error); }
        }
        else {
        for (const [index, expression] of nextVertexAndPointMathJSCodeLines.entries()) {
            try {
                math.evaluate(expression, scope);
            } catch (error) {
                const errorDiv = document.getElementById('errorMessage');
                let highlightedExpression = expression;
                // Extract character position from error message if it exists
                const charMatch = error.message.match(/\(char (\d+)\)/); // matches messages like "SyntaxError: Value expected (char 58)"
                if (charMatch) {
                    const charPos = parseInt(charMatch[1]) - 1;
                    // Check if the character position is at the end of the line
                    if (charPos === expression.length) {
                        highlightedExpression = expression +
                            '<span class="error-highlight"> </span>';
                    } else {
                        // Split the expression and insert a span around the error character
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
            console.log("pointsQueue length:", scope.pointsQueue.length);
        }
         // Add nextPoints from scope (the user sets this value) to queue
        addPointsToQueue(scope.nextPoint);

        // Update special occasionally useful vars in scope for next iteration
        scope.currentTargetIndex = scope.nextTargetIndex;

        // Check if current iteration output matches last iteration
        if (writeToDOMCurrentOutput.length === writeToDOMLastOutput.length &&
            writeToDOMCurrentOutput.every((val, idx) => val === writeToDOMLastOutput[idx])) {
          // Remove the lines we just wrote
          if (writeToDOMDiv) {
            const lines = writeToDOMDiv.childNodes;
            for (let j = 0; j < writeToDOMCurrentOutput.length; j++) {
              if (lines.length > 0) {
                writeToDOMDiv.removeChild(lines[lines.length - 1]);
              }
            }
            // Update or add repetition count
            if (writeToDOMRepetitionCount > 1) {
              // Remove the previous (x n) line
              if (lines.length > 0) {
                writeToDOMDiv.removeChild(lines[lines.length - 1]);
              }
            }
            writeToDOMRepetitionCount++;
            const countNode = document.createElement('i');
            countNode.textContent = `(x ${writeToDOMRepetitionCount})\n`;
            writeToDOMDiv.appendChild(countNode);
          }
        } else {
          // Different output, reset repetition count
          writeToDOMRepetitionCount = 1;
          writeToDOMLastOutput = [...writeToDOMCurrentOutput];
        }

        firstTime = false;
      }

      currentStep = endStep;
      consumePoints(currentStep / steps, points, pointsInViewCount / currentStep);  // points are plotted in consumePoints()
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

function toggleProgressIndicator(show) {
  const progressIndicator = document.getElementById('progress-indicator');
  progressIndicator.style.display = show ? 'block' : 'none';
}

async function generateAndDraw() {
  const vertices = parseInt(document.getElementById('vertices').value, 10);
  const steps = parseInt(document.getElementById('steps').value, 10);
  const alphaValue = parseFloat(document.getElementById('alpha').value);
  const nextVertexAndPointMathJSCodeString = document.getElementById("nextVertexAndPointMathJSCode").value;
  const debugMode = document.getElementById('debugMode').checked;

  // Clear any previous error message
  document.getElementById('errorMessage').innerHTML = '';

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
          setVerticesCount(vertices);
      }
    // save the current transformation matrix
    ctx.save();
    // use the identity matrix while clearing the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // restore the transform
    ctx.restore();

    await new Promise(resolve => setTimeout(resolve, 5));

    toggleProgressIndicator(true);
    try {
      await generatePoints(steps, nextVertexAndPointMathJSCodeString, debugMode, (progress, points, proportionInView) => {
        document.getElementById('progress-indicator').textContent =
          `Generating points... ${Math.round(progress * 100)}%`;
        document.getElementById('pointsInView').textContent = `% of points outside current view: ${(100-proportionInView*100).toFixed(1)}%`;
        drawPointsOnCanvas(ctx, points, alphaValue);
        // Redraw vertices after each chunk to ensure they use updated zoom/pan values
        drawVerticesOnCanvas(ctx);
      });
      // Only clear if we completed successfully
      if (document.getElementById('progress-indicator').textContent.includes('100%')) {
        toggleProgressIndicator(false);
      }
    } catch (error) {
      if (error.message !== 'Generation cancelled') {
        // Hide the progress indicator but keep the points
        toggleProgressIndicator(false);
        throw error;
      }
      // If generation was cancelled, just continue but don't clear the progress-indicator
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
  resetTargetsLocations(vertices); // this evenly distributes the vertices on a circle

  // save the current transformation matrix
  ctx.save();
  // use the identity matrix while clearing the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // restore the transform
  ctx.restore();

  drawVerticesOnCanvas(ctx);
});

// Share functionality
function generateShareableLink() {
  const initCode = document.getElementById('initializationMathJSCode').value;
  const mainCode = document.getElementById('nextVertexAndPointMathJSCode').value;
  
  // Create an object with the code data
  const shareData = {
    initCode: initCode,
    mainCode: mainCode
  };
  
  // Encode the data as a URL parameter
  const encodedData = btoa(JSON.stringify(shareData));
  
  // Generate the shareable URL
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?code=${encodedData}`;
  
  return shareUrl;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
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
      // Show the URL in a prompt as fallback
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

// Function to load shared code from URL parameters
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
      
      // If there's shared code, enable the customize checkbox so users can see it
      if (shareData.mainCode || shareData.initCode) {
        document.getElementById('customizeMathJSCode').checked = true;
        // Trigger the change event to show the code areas
        document.getElementById('customizeMathJSCode').dispatchEvent(new Event('change'));
      }
      
      // Clean up the URL by removing the code parameter
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
    } catch (error) {
      console.error('Error loading shared code:', error);
    }
  }
}

// Load shared code when the page loads
loadSharedCode();

generateAndDraw();
