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
const slidersValuesCache = new Map();

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
        step: 0.01  // this is coupled to the .toFixed(2) calls, below
    });

    // Store the initial value
    slidersValuesCache.set(label, defaultValue);
    valueDisplay.innerHTML = '<big>' + defaultValue.toFixed(2) + '</big>';

    // Check for cached value from share link and update if exists
    if (window.sharedSliderValues && window.sharedSliderValues[label] !== undefined) {
        const sharedValue = window.sharedSliderValues[label];
        slider.noUiSlider.set(sharedValue);
        slidersValuesCache.set(label, sharedValue);
        valueDisplay.innerHTML = '<big>' + sharedValue.toFixed(2) + '</big>';
    }

    // Update value when slider changes
    slider.noUiSlider.on('update', function(values) {
        const newValue = parseFloat(values[0]);
        const oldValue = slidersValuesCache.get(label);
        if (newValue !== oldValue) {
            slidersValuesCache.set(label, newValue);
            valueDisplay.innerHTML = '<big>' + newValue.toFixed(2) + '</big>' ;
            if (clearPointsWhenChanged) {
                // Regenerate points when slider changes
                clearTimeout(canvas.regenerateTimeout);
                canvas.regenerateTimeout = setTimeout(() => generateAndDraw(true), 200);
            } else {
                clearTimeout(canvas.regenerateTimeout);
                canvas.regenerateTimeout = setTimeout(() => generateAndDraw(false), 200);
            }
        }
    });

    return container;
}

function getCircleCoord(theta) {
  const x = CIRCLE_RADIUS * Math.cos(theta);
  const y = CIRCLE_RADIUS * Math.sin(theta);
  return { x, y };
}

// Helper function to convert array/matrix RGB values to CSS color strings
function convertToColorString(color) {
    if (typeof color === 'string') {
        return color; // Already a string, return as-is
    }

    // Handle MathJS matrix
    if (color && typeof color.toArray === 'function') {
        const arr = color.toArray();
        // Handle both [[r,g,b]] and [r,g,b] formats
        const rgbArray = Array.isArray(arr[0]) ? arr[0] : arr;
        if (rgbArray.length >= 3) {
            const [r, g, b, a = 1] = rgbArray;
            return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
        }
    }

    // Fallback to original color if we can't convert
    return color;
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

function writeToDOM(...args) {
  if (!writeToDOMDiv) {
    writeToDOMDiv = document.createElement('div');
    writeToDOMDiv.style.cssText = 'background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; white-space: pre-wrap;';
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.parentNode.insertBefore(writeToDOMDiv, errorDiv);
  }

  // Join all arguments with spaces, similar to Python's print()
  const text = args.map(arg => String(arg)).join(' ');

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
function generatePoints(debugMode, consumePoints) {
  const generationId = ++currentGenerationId;

  const nextVertexAndPointMathJSCodeString = document.getElementById("nextVertexAndPointMathJSCode").value;

  // Only clear controls if this is a fresh generation (not from slider update)
  // and if the code has changed
  if (!canvas.regenerateTimeout && nextVertexAndPointMathJSCodeString !== canvas.lastCode) {
    const sliders = document.getElementById('sliders');
    sliders.innerHTML = '';
    slidersValuesCache.clear();
    canvas.lastCode = nextVertexAndPointMathJSCodeString;
  }

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
      // default color for current point (black)
      currentPointColor: 'rgba(0, 0, 0, 1)',
      // optional color for next point (undefined means use currentPointColor)
      nextPointColor: undefined,
      hasKey: hasKey,
      write: writeToDOM,
      createSlider: function(label, min, max, defaultValue, clearPointsWhenChanged = true) {
          const sliders = document.getElementById('sliders');
          if (!slidersValuesCache.has(label)) {
              VERBOSE && console.log(`This control does not exist yet, creating it now: "${label}" (${min} to ${max}, default: ${defaultValue})`);
              const control = createUserControl(label, min, max, defaultValue, clearPointsWhenChanged);
              sliders.appendChild(control);
          }
          return slidersValuesCache.get(label) || defaultValue;
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
      },
      points: function(numPoints) {
          const stepsInput = document.getElementById('steps');
          stepsInput.value = numPoints;
          // Trigger input event to update UI
          stepsInput.dispatchEvent(new Event('input', { bubbles: true }));
          return numPoints;
      },
      opacity: function(alphaValue) {
          const alphaInput = document.getElementById('alpha');
          alphaInput.value = alphaValue;
          // Trigger input event to update UI
          alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
          return alphaValue;
      }
  };
  // targets() is a closure over scope['targetPoints'] and scope['targetPointsLength'] so it needs to be created after those are set.
  scope['targets'] = function(numVertices) {
      if (targets.length !== numVertices) {
          setVerticesCount(numVertices)
          scope['targetPoints'] = math.matrix(targets.map( (pointObj) => { return [pointObj.x, pointObj.y] }));
          scope['targetPointsLength'] = targets.length;
      }
  }
  scope['vertices'] = scope['targets']  // vertices() user function name is deprecated but supported

  let points = [];
  let pointsInViewCount = 0;
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

  // Helper function to convert complex number to [x, y] array
  function complexToPoint(complex) {
    return [complex.re, complex.im];
  }

  function isMathJSComplexNumber(o) {
      return o && typeof o === 'object' && o.re !== undefined && o.im !== undefined
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


  const vertices = parseInt(document.getElementById('vertices').value, 10);
  const steps = parseInt(document.getElementById('steps').value, 10);
  const alphaValue = parseFloat(document.getElementById('alpha').value);

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
        showStuff = (VERBOSE && (firstTime | (i % 1000000 == 0)));
        // If currentPoint is undefined, give it a random point
        if (scope.currentPoint === undefined) {
          scope.currentPoint = getRandomVisiblePoint();
        }
        if (showStuff) {
            console.log("i:", i)
            console.log("currentPoint:", scope.currentPoint);
        }
        currentPointsArray = scope.currentPoint.toArray();
        // save points to be plotted
        currentPointsArray.forEach(function (currentPointArray) {
            // Determine the color to use: nextPointColor if set, otherwise currentPointColor
            const rawColor = scope.nextPointColor !== undefined ? scope.nextPointColor : scope.currentPointColor;
            const pointColor = convertToColorString(rawColor);
            points.push({ x: currentPointArray[0], y: currentPointArray[1], color: pointColor });
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
        }
        // Update currentPoint from nextPoint for next iteration
        if (scope.nextPoint !== undefined) {
          scope.currentPoint = scope.nextPoint;
          scope.nextPoint = undefined;
        }

        // Update special occasionally useful vars in scope for next iteration
        scope.currentTargetIndex = scope.nextTargetIndex;

        // Update currentPointColor for next iteration if nextPointColor was set
        if (scope.nextPointColor !== undefined) {
          scope.currentPointColor = scope.nextPointColor;
          scope.nextPointColor = undefined; // Reset nextPointColor
        }

        // Check if current iteration output matches last iteration (only if there's actual output)
        if (writeToDOMCurrentOutput.length > 0 &&
            writeToDOMCurrentOutput.length === writeToDOMLastOutput.length &&
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
            if (writeToDOMLastOutput.length === 1) {
              countNode.textContent = `(repeated "${writeToDOMLastOutput[0]}" x ${writeToDOMRepetitionCount})\n`;
            } else {
              const statementsText = writeToDOMLastOutput.map(s => s).join('\n');
              countNode.textContent = `(repeated ${writeToDOMLastOutput.length} writes:\n${statementsText}\nx ${writeToDOMRepetitionCount})\n`;
            }
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
  ctx.globalAlpha = alphaValue;

  // Group points by color to minimize fillStyle changes
  const pointsByColor = new Map();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const color = point.color;
    if (!pointsByColor.has(color)) {
      pointsByColor.set(color, []);
    }
    pointsByColor.get(color).push(point);
  }

  // Draw points grouped by color
  for (const [color, colorPoints] of pointsByColor) {
    ctx.fillStyle = color;
    for (let i = 0; i < colorPoints.length; i++) {
      ctx.fillRect(colorPoints[i].x, colorPoints[i].y, 1/zoom, 1/zoom);
    }
  }
  ctx.restore();
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
  const nextVertexAndPointMathJSCodeString = document.getElementById("nextVertexAndPointMathJSCode").value;
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
      }

    // Clear canvas only if requested
    if (clearPoints) {
      // save the current transformation matrix
      ctx.save();
      // use the identity matrix while clearing the canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // restore the transform
      ctx.restore();
    }

    await new Promise(resolve => setTimeout(resolve, 5));

    toggleProgressIndicator(true);
    try {
      await generatePoints(debugMode, (progress, points, proportionInView) => {
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
    // Only reset button if this generation wasn't superseded by a newer one
    if (generationId === currentGenerationId) {
      generateBtn.textContent = 'Generate';
      generateBtn.disabled = false;
    }
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
document.getElementById('generateBtn').addEventListener('click', function() {
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn.textContent === 'Stop') {
    // Stop generation by incrementing the generation ID
    currentGenerationId++;
    // Hide the progress indicator
    toggleProgressIndicator(false);
    // Reset button to Generate immediately
    generateBtn.textContent = 'Generate';
  } else {
    generateAndDraw(true);
  }
});

document.getElementById('generateAddBtn').addEventListener('click', function() {
  generateAndDraw(false);
});

// Share functionality
function generateShareableLink() {
  const initCode = document.getElementById('initializationMathJSCode').value;
  const mainCode = document.getElementById('nextVertexAndPointMathJSCode').value;

  // Create an object with the code data and form field values
  const shareData = {
    initCode: initCode,
    mainCode: mainCode,
    targets: document.getElementById('vertices').value,
    steps: document.getElementById('steps').value,
    alpha: document.getElementById('alpha').value,
    centerX: document.getElementById('centerX').value,
    centerY: document.getElementById('centerY').value,
    zoom: document.getElementById('zoom').value,
    customizeMathJSCode: document.getElementById('customizeMathJSCode').checked,
    examplesToggle: document.getElementById('examples-toggle').checked,
    advancedStuffToggle: document.getElementById('advanced-stuff-toggle').checked,
    advancedExamplesToggle: document.getElementById('advanced-examples-toggle').checked,
    debugMode: document.getElementById('debugMode').checked,
    customizeView: document.getElementById('customizeView').checked,
    sliders: Object.fromEntries(slidersValuesCache),
    vertexPositions: targets.map(target => ({ x: target.x, y: target.y }))
  };

  // Encode the data as a URL parameter
  // Use encodeURIComponent to handle special characters properly
  const encodedData = encodeURIComponent(btoa(JSON.stringify(shareData)));

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
      // URLSearchParams.get() already URL-decodes, so just do base64 and JSON
      const shareData = JSON.parse(atob(encodedCode));

      if (shareData.initCode !== undefined) {
        document.getElementById('initializationMathJSCode').value = shareData.initCode;
      }

      if (shareData.mainCode !== undefined) {
        document.getElementById('nextVertexAndPointMathJSCode').value = shareData.mainCode;
      }

      // Restore form field values
      if (shareData.targets !== undefined) {
        document.getElementById('vertices').value = shareData.targets;
      }

      if (shareData.steps !== undefined) {
        document.getElementById('steps').value = shareData.steps;
      }

      if (shareData.alpha !== undefined) {
        document.getElementById('alpha').value = shareData.alpha;
      }

      if (shareData.centerX !== undefined) {
        document.getElementById('centerX').value = shareData.centerX;
      }

      if (shareData.centerY !== undefined) {
        document.getElementById('centerY').value = shareData.centerY;
      }

      if (shareData.zoom !== undefined) {
        document.getElementById('zoom').value = shareData.zoom;
      }

      // Restore checkbox states
      if (shareData.customizeMathJSCode !== undefined) {
        document.getElementById('customizeMathJSCode').checked = shareData.customizeMathJSCode;
        document.getElementById('customizeMathJSCode').dispatchEvent(new Event('change'));
      }

      if (shareData.examplesToggle !== undefined) {
        document.getElementById('examples-toggle').checked = shareData.examplesToggle;
        document.getElementById('examples-toggle').dispatchEvent(new Event('change'));
      }

      if (shareData.advancedStuffToggle !== undefined) {
        document.getElementById('advanced-stuff-toggle').checked = shareData.advancedStuffToggle;
        document.getElementById('advanced-stuff-toggle').dispatchEvent(new Event('change'));
      }

      if (shareData.advancedExamplesToggle !== undefined) {
        document.getElementById('advanced-examples-toggle').checked = shareData.advancedExamplesToggle;
        document.getElementById('advanced-examples-toggle').dispatchEvent(new Event('change'));
      }

      if (shareData.debugMode !== undefined) {
        document.getElementById('debugMode').checked = shareData.debugMode;
        document.getElementById('debugMode').dispatchEvent(new Event('change'));
      }

      if (shareData.customizeView !== undefined) {
        document.getElementById('customizeView').checked = shareData.customizeView;
        document.getElementById('customizeView').dispatchEvent(new Event('change'));
      }

      // Store slider values to be applied after sliders are created
      if (shareData.sliders) {
        window.sharedSliderValues = shareData.sliders;
      }

      // Restore vertex positions
      if (shareData.vertexPositions && Array.isArray(shareData.vertexPositions)) {
        targets = shareData.vertexPositions.map(pos => ({ x: pos.x, y: pos.y }));
      }

    } catch (error) {
      console.error('Error loading shared code:', error);
    }
  }
}

// Load shared code when the page loads
loadSharedCode();

generateAndDraw();
