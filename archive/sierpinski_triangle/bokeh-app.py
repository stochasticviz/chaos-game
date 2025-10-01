import numpy as np
import holoviews as hv
import panel as pn  # Panel for widgets
hv.extension('bokeh')  # Enable the Bokeh backend
import random
import math
from holoviews.operation.datashader import rasterize


def get_circle_coord(theta, x_center, y_center, radius):
    x = radius * math.cos(theta) + x_center
    y = radius * math.sin(theta) + y_center
    return (x, y)


def get_all_circle_coords(x_center, y_center, radius, n_points):
    ''' Get the coordinates of n_points equidistant points on a circle. '''
    thetas = [ (i / n_points * math.tau) + .5 for i in range(n_points)]
    circle_coords = [get_circle_coord(theta, x_center, y_center, radius) for theta in thetas]
    return circle_coords

def generate_polygon_points_2d(polygon_order, steps, scalar):
    # print(f"Generating polygon points for polygon_order={polygon_order}, steps={steps}, scalar={scalar}")
    targets = get_all_circle_coords(x_center=0, y_center=0, radius=750, n_points=polygon_order)
    points = []
    point = (100, 100)  # it doesn't matter where you start
    for _ in range(steps):
        target = random.choice(targets)
        #point = ((point[0] + target[0]) / 2, (point[1] + target[1]) / 2)    # old way
        delta_v = (target[0] - point[0], target[1] - point[1])
        delta_v_scaled = (delta_v[0] * scalar, delta_v[1] * scalar)
        point = (point[0] + delta_v_scaled[0], point[1] + delta_v_scaled[1])
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
#cache = {}
def make_holoviz_polygon_points_obj__with_cache(vertices, steps, scalar):
    if (vertices, steps, scalar) not in cache:
        points_obj = hv.Points(generate_polygon_points_2d(vertices, steps, scalar))
        points_obj.opts(color='k', size=.1)
        cache[(vertices, steps, scalar)] = rasterize(points_obj, dynamic=False, width=800, height=800)
    return cache[(vertices, steps, scalar)]

def make_holoviz_polygon_points_obj(vertices, steps, scalar):
    points_obj = hv.Points(generate_polygon_points_2d(vertices, steps, scalar))
    points_obj.opts(color='k')
    return points_obj

# Create panel layout
def create_interactive_plot():
    # Create sliders
    sierpinksi_gasket_polygon_live_view = hv.DynamicMap(
        make_holoviz_polygon_points_obj,
        kdims=[
            hv.Dimension("steps", default=16384, label="Steps"),
            hv.Dimension("vertices", default=3, label="Polygon Vertices"),
            hv.Dimension("scalar", label="scalar of vector"),
        ]
    ).redim.values(
        vertices=np.arange(2, 50, 1),
        steps=np.power(2, np.arange(8, 25)),
        scalar=np.arange(.2, 3, .1)
    )

    rasterized_dynamic_map = rasterize(sierpinksi_gasket_polygon_live_view, dynamic=True).opts(height=1000, width=1000, responsive=True)


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
        rasterized_dynamic_map,
        pn.pane.Markdown("(More vertices requires more steps)"),

    )

print("Starting chaos game Bokeh app server... Open the link in your browser.")
create_interactive_plot().servable()
