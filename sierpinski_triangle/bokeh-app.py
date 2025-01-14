import numpy as np
import holoviews as hv
import panel as pn  # Panel for widgets
hv.extension('bokeh')  # Enable the Bokeh backend
import random
import math
from holoviews.operation.datashader import rasterize

# Functions for generating polygon points
def get_circle_coord(theta, x_center, y_center, radius):
    x = radius * math.cos(theta) + x_center
    y = radius * math.sin(theta) + y_center
    return (x, y)

def get_all_circle_coords(x_center, y_center, radius, n_points):
    thetas = [ (i / n_points * math.tau) + .5 for i in range(n_points)]
    circle_coords = [get_circle_coord(theta, x_center, y_center, radius) for theta in thetas]
    return circle_coords

def generate_polygon_points_2d(polygon_order, steps):
    targets = get_all_circle_coords(x_center=0, y_center=0, radius=750, n_points=polygon_order)
    points = []
    point = (100, 100)
    for _ in range(steps):
        target = random.choice(targets)
        point = ((point[0] + target[0]) / 2.0, (point[1] + target[1]) / 2.0)
        points.append(point)
    return points

def generate_polygon_points_2d_optimized(polygon_order, steps):
    # Assuming get_all_circle_coords returns a list of (x, y) tuples
    targets = get_all_circle_coords(x_center=0, y_center=0, radius=750, n_points=polygon_order)
    n_targets = len(targets)

    # Pre-generate random indices for speed (instead of random.choice on each iteration)
    random_indices = [random.randint(0, n_targets - 1) for _ in range(steps)]

    # Pre-allocate the output list
    points = [None] * steps

    # Start point
    x, y = 100.0, 100.0

    # Iteratively compute the midpoint
    for i in range(steps):
        tx, ty = targets[random_indices[i]]
        x = x + 0.5 * (tx - x)
        y = y + 0.5 * (ty - y)
        points[i] = (x, y)

    return points

# Cached Holoviews Points object
cache = {}
def make_holoviz_polygon_points_obj(vertices, steps):
    if (vertices, steps) not in cache:
        points_obj = hv.Points(generate_polygon_points_2d(vertices, steps))
        points_obj.opts(color='k', size=.1)
        cache[(vertices, steps)] = rasterize(points_obj, dynamic=False, width=800, height=800)
    return cache[(vertices, steps)]


# Create panel layout
def create_interactive_plot():
    # Create sliders

    '''
    sierpinksi_gasket_polygon_live_view = hv.DynamicMap(
        make_holoviz_polygon_points_obj,
        kdims=["vertices", "steps"]
    ).redim.values(
        vertices=np.arange(3, 50, 1),  # Discrete values for vertices
        steps=np.power(2, np.arange(3, 25))  # Discrete values for steps
    ).redim(
        vertices=hv.Dimension("vertices", default=6),
        steps=hv.Dimension("steps", default=8)
    ).opts(width=800, height=800)
    '''

    sierpinksi_gasket_polygon_live_view = hv.DynamicMap(
        make_holoviz_polygon_points_obj,
        kdims=[
            hv.Dimension("steps", default=16384, label="Steps"),
            hv.Dimension("vertices", default=3, label="Polygon Vertices")
        ]
    ).redim.values(
        vertices=np.arange(2, 50, 1),
        steps=np.power(2, np.arange(8, 25))
    ).opts(width=800, height=800)
    # Bind sliders to the DynamicMap via parameters
    #sierpinksi_gasket_polygon_live_view = hv.DynamicMap(
    #    make_holoviz_polygon_points_obj,
    #    kdims=["vertices", "steps"]
    #).redim.values(vertices=np.arange(3, 50, 1), steps=np.power(2, np.arange(3, 25))
    #               ).redim(
    #                vertices=hv.Dimension("vertices", default=3),
    #                steps=hv.Dimension("steps", default=16384)).opts(width=800, height=800)


    return pn.Column(
        pn.pane.Markdown("Fool around with variations on the [Chaos game](https://www.youtube.com/watch?v=k3V72Qvcn94). Try bumping up the number of steps ->"),
        sierpinksi_gasket_polygon_live_view,
        pn.pane.Markdown("(More vertices requires more steps)"),

    )

# Main function
def main():
    interactive_plot = create_interactive_plot()
    print("Starting Bokeh server with sliders... Open the link in your browser.")
    pn.serve(interactive_plot, port=5006, show=True, title='Fooling around with the Chaos game')

# Run script
if __name__ == "__main__":
    main()
