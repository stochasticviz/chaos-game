
'''
Makes a 3D sierpinski triangle.

First make a conda env. See docs in triangle.py
Then:
    python -m pip install --upgrade matplotlib  # this should install mpl_toolkits

# RUN IT:
    python3.9 triangle.make.array.3d.py

'''

import random
import numpy

from mpl_toolkits import mplot3d
import matplotlib.pyplot as plt

POINTS_COUNT_TARGET=100000
ITERATIONS_BETWEEN_DISPLAY_UPDATES=10000  # try 1000 thru POINTS_COUNT_TARGET
SPACE = (1500, 1500, 1500)

targets = ((0, 0, 0), (SPACE[0], 0, 0), (0, SPACE[1], 0), (SPACE[0], SPACE[1], 0), (SPACE[0]/2, SPACE[1]/2, SPACE[2]))

fig = plt.figure(figsize=(12,10))
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
plt.show(block=False)  # on my current backend this pauses until you close the window, and allowing panning and zooming.
