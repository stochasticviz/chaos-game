# Chaos Game Explorer

Fun tools for exploring the [Chaos Game](https://www.youtube.com/watch?v=k3V72Qvcn94).

## [chaos-game.html](web/chaos-game.html)
Try it live [here](https://stochasticviz.github.io/chaos-game/chaos-game.html). Originally ported from bokeh-app.py mostly by ChatGPT, but has grown since. 

## [chaos-game-3d.html](web/chaos-game-3d.html)
Try it live [here](https://stochasticviz.github.io/chaos-game/chaos-game-3d.html).

## [bokeh-app.py](sierpinski_triangle/bokeh-app.py)
Original implementation using Bokeh/Panel.

Requires: numpy, holoviews, panel, bokeh

### Installation
Using conda:

```
conda env create -f sierpinski_triangle/environment.yml

conda activate chaos-game
```

### Run
```
bokeh serve --show bokeh-app.py
```

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

You are free to use, modify, and distribute this project under the terms of the Apache 2.0 License.
