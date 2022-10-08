
'''
Makes a 3D sierpinski triangle.

First make a conda env. See docs in triangle.py
Then:
    python -m pip install --upgrade matplotlib  # this should install mpl_toolkits

# RUN IT:
    python3.9 triangle.make.array.3d.py

'''

import random
import numpy as np

from mpl_toolkits import mplot3d
import matplotlib.pyplot as plt

POINTS_COUNT_TARGET=75000
ITERATIONS_BETWEEN_DISPLAY_UPDATES=25000  # try 1000 thru POINTS_COUNT_TARGET
SPACE = (1500, 1500, 1500)

targets = (np.array([0, 0, 0]), np.array([SPACE[0], 0, 0]), np.array([0, SPACE[1], 0]), np.array([SPACE[0], SPACE[1], 0]), np.array([SPACE[0]/2, SPACE[1]/2, SPACE[2]]))

fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection='3d')
plt.ion()
plt.show()
X = []
Y = []
Z = []
i = 0
point = np.array((100,100,100))

while i < POINTS_COUNT_TARGET:
    i = i + 1
    target = random.choice(targets)
    point = (point + target) / 2
    X.append(point[0])
    Y.append(point[1])
    Z.append(point[2])
    if (i % ITERATIONS_BETWEEN_DISPLAY_UPDATES) == 0:  # this is an opt to update the display less frequently
        print("points count:",i," making numpy arrays. point=",point)
        ax.scatter3D(np.array(X), np.array(Y), np.array(Z), s=.1, c='black', alpha=.1)  # "s" is the size (diameter) of point
        plt.draw()
        plt.pause(.2)

plt.pause(20)
