
'''
Makes a 3D sierpinski triangle.

First make a conda env. See docs in triangle.py
Then:
    python -m pip install --upgrade matplotlib  # this should install mpl_toolkits

# RUN IT:
    python <this-file>.py

'''

import random
import numpy as np

from mpl_toolkits import mplot3d
import matplotlib.pyplot as plt

#https://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
def get_equidistant_points_on_unit_sphere_approximation(n_points):
    print('get_equidistant_points_on_unit_sphere_approximation', n_points)
    from random import random,randint
    r = 1
    n = n_points
    best_closest_d = 0
    best_points = []
    points = [(r,0,0) for i in range(n)]
    for simulation in range(100000):
        x = random()*r
        y = random()*r
        z = r-(x**2+y**2)**0.5
        if randint(0,1):
            x = -x
        if randint(0,1):
            y = -y
        if randint(0,1):
            z = -z
        closest_dist = (2*r)**2
        closest_index = None
        for i in range(n):
            for j in range(n):
                if i==j:
                    continue
                p1,p2 = points[i],points[j]
                x1,y1,z1 = p1
                x2,y2,z2 = p2
                d = (x1-x2)**2+(y1-y2)**2+(z1-z2)**2
                if d < closest_dist:
                    closest_dist = d
                    closest_index = i
        if simulation % 10000 == 0:
            print (simulation,closest_dist)
        if closest_dist > best_closest_d:
            best_closest_d = closest_dist
            best_points = points[:]
        points[closest_index]=(x,y,z)
    return best_points

def normalize(points):
    """Normalize points to lie on the unit sphere."""
    return points / np.linalg.norm(points, axis=1, keepdims=True)

def tetrahedron():
    """4 points - Tetrahedron"""
    points = np.array([
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1]
    ])
    return normalize(points)

def octahedron():
    """6 points - Octahedron"""
    points = np.array([
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1]
    ])
    return normalize(points)  # Already on unit sphere, but normalized for consistency

def cube():
    """8 points - Cube"""
    points = np.array([
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
    ])
    return normalize(points)

def icosahedron():
    """12 points - Icosahedron"""
    phi = (1 + np.sqrt(5)) / 2  # Golden ratio
    points = np.array([
        [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
        [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
        [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]
    ])
    return normalize(points)

def dodecahedron():
    """20 points - Dodecahedron"""
    phi = (1 + np.sqrt(5)) / 2  # Golden ratio
    points = np.array([
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        [0, 1/phi, phi], [0, 1/phi, -phi], [0, -1/phi, phi], [0, -1/phi, -phi],
        [1/phi, phi, 0], [1/phi, -phi, 0], [-1/phi, phi, 0], [-1/phi, -phi, 0],
        [phi, 0, 1/phi], [phi, 0, -1/phi], [-phi, 0, 1/phi], [-phi, 0, -1/phi]
    ])
    return normalize(points)

def get_equidistant_points_on_sphere(center_x, center_y, center_z, radius, n_points):
    # if the number of points is one of the platonic solids, return exactly the right answer
    points = []
    if n_points == 4:
        points = tetrahedron()
    if n_points == 6:
        points = octahedron()
    if n_points == 8:
        points = cube()
    if n_points == 12:
        points = icosahedron()
    if n_points == 20:
        points = dodecahedron()
    if points is None:
        # there is no exact equal distribution of points on a sphere so get an approximation
        points = get_equidistant_points_on_unit_sphere_approximation(n_points)
    return [(x * radius + center_x, y * radius + center_y, z * radius + center_z) for (x, y, z) in points]


VERTICES = 6
POINTS_COUNT_TARGET=100000
ITERATIONS_BETWEEN_DISPLAY_UPDATES=10000  # try 1000 thru POINTS_COUNT_TARGET
SPACE_DIAMETER = 1500

center_x = SPACE_DIAMETER/2
center_y = SPACE_DIAMETER/2
center_z = SPACE_DIAMETER/2
radius = SPACE_DIAMETER/3
targets = get_equidistant_points_on_sphere(center_x, center_y, center_z, radius, VERTICES)
print('targets', targets)

from itertools import combinations
print("list(combinations(targets, 2))=", list(combinations(targets, 2)))
print('all pairwise distances: ', list(map(lambda combo: np.linalg.norm(np.array(combo[0]) - np.array(combo[1])), combinations(targets, 2))))

fig = plt.figure(figsize=(12,12))
ax = fig.add_subplot(111, projection='3d')
plt.ion()

plt.show()
X = []
Y = []
Z = []
# arbitrary starting point
point_x = 100
point_y = 100
point_z = 100

i = 0
for i in range(POINTS_COUNT_TARGET):
    target = random.choice(targets)
    point_x = (point_x + target[0]) / 2
    point_y = (point_y + target[1]) / 2
    point_z = (point_z + target[2]) / 2
    X.append(point_x)
    Y.append(point_y)
    Z.append(point_z)
    if (i % ITERATIONS_BETWEEN_DISPLAY_UPDATES) == 0:  # this is an opt to update the display less frequently
        print("points count:", i)
        # apparently ax.scatter3D() works as an appending operation, not a new scatter. So just add the new points.
        ax.scatter3D(X, Y, Z, s=1, c='black', alpha=.2, depthshade=True)  # "s" is the size (diameter) of point   #(random.random(), random.random(), random.random()),
        plt.draw()
        plt.pause(.05)
        X = []
        Y = []
        Z = []

#plt.pause(10)
plt.show(block=True)  # on my current backend this pauses until you close the window, and allowing panning and zooming.
