# Chaos Game Explorer

Fun web tools for exploring the [Chaos Game](https://www.youtube.com/watch?v=k3V72Qvcn94).

## chaos-game.html
Browser-based version ported from bokeh-app.py by ChatGPT. Open directly in any web browser.

## bokeh-app.py
Original implementation using Bokeh/Panel.

Requires: numpy, holoviews, panel, bokeh

### Installation
Using conda:

```
conda env create -f environment.yml
conda activate chaos-game
```

### Run
```
bokeh serve --show bokeh-app.py
```
