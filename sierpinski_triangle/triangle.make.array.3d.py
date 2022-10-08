
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
ITERATIONS_BETWEEN_DISPLAY_UPDATES=1000  # try 1000 thru POINTS_COUNT_TARGET
SPACE = (1500, 1500, 1500)

targets = ((0, 0, 0), (SPACE[0], 0, 0), (0, SPACE[1], 0), (SPACE[0], SPACE[1], 0), (SPACE[0]/2, SPACE[1]/2, SPACE[2]))

fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection='3d')
plt.ion()
plt.show()
X = []
Y = []
Z = []
i = 0
point = (100,100,100)

while i < POINTS_COUNT_TARGET:
    i = i + 1
    target = random.choice(targets)
    point = numpy.add(point, target) / 2
    X.append(point[0])
    Y.append(point[1])
    Z.append(point[2])
    if (i % ITERATIONS_BETWEEN_DISPLAY_UPDATES) == 0:  # this is an opt to update the display less frequently
        print("points count:",i," making numpy arrays. point=",point)
        # apparently ax.scatter3D() works as an appending operation, not a new scatter. So just add the new points.
        #ax.scatter3D(np.array(X), np.array(Y), np.array(Z), s=1, c='black', alpha=.2, depthshade=True)  # "s" is the size (diameter) of point   #(random.random(), random.random(), random.random()),
        ax.scatter3D(X, Y, Z, s=1, c='black', alpha=.2, depthshade=True)  # "s" is the size (diameter) of point   #(random.random(), random.random(), random.random()),
        #ax.contour3D(X, Y, Z) # doesn't work, requires X Y Z to all be 2d (?)
        #ax.plot_trisurf(X, Y, Z, cmap='viridis', edgecolor='none')  # interesting
        #ax.stem(X, Y, Z)  # not interesting
        plt.draw()
        plt.pause(.1)
        X = []
        Y = []
        Z = []
        #if i == 100:
        #    plt.pause(100)

#plt.pause(10)
plt.show(block=True)  # on my current backend this pauses until you close the window, and allowing panning and zooming.
