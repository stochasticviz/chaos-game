# Interactive Chaos Game

These are fun tools for exploring the [Chaos Game](https://www.youtube.com/watch?v=k3V72Qvcn94).

## 2D
Hosted, live: [chaos-game.html](https://herdrick.github.io/chaos-game/chaos-game.html)

[Source](web/chaos-game.html)

## 3D
Hosted, live: [chaos-game-3d.html](https://herdrick.github.io/chaos-game/chaos-game-3d.html)

[Source](web/chaos-game-3d.html)



## Archives

### [bokeh-app.py](sierpinski_triangle/bokeh-app.py)
Original implementation using Python Bokeh and Panel.

Requires: numpy, holoviews, panel, bokeh

#### Installation
Using conda:

```
conda env create -f sierpinski_triangle/environment.yml

conda activate chaos-game
```

#### Run
```
bokeh serve --show bokeh-app.py
```

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

You are free to use, modify, and distribute this project under the terms of the Apache 2.0 License.
