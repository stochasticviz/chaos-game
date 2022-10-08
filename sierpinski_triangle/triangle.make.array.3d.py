
'''
Makes a 3D sierpinski triangle.

First make a conda env, as in triangle.py
Then
    python -m pip install --upgrade matplotlib

# RUN IT:
    python3.9 triangle.make.array.3d.py

'''

import random
import numpy as np

from mpl_toolkits import mplot3d
import matplotlib.pyplot as plt

def x(X):
    return X[0]
def y(X):
    return X[1]
def z(X):
    return X[2]

size = (1500, 1500, 1500)

targets = (np.array([0, 0, 0]), np.array([size[0], 0, 0]), np.array([0, size[1], 0]), np.array([size[0], size[1], 0]), np.array([size[0]/2, size[1]/2, size[2]]))

point = np.array((100,100,100))

#    if X_numpy_array is None:
#        X_numpy_array = np.array(X)
#    if Y_numpy_array is None:
#        Y_numpy_array = np.array(Y) #.astype(float)
#    if Z_numpy_array is None:
#        Z_numpy_array = np.array(Z)


fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection='3d')
plt.ion()
plt.show()
X = []
Y = []
Z = []
i = 0
POINTS_COUNT_TARGET=100000
ITERATIONS_BETWEEN_DISPLAY_UPDATES=100000  # try 1000 thru POINTS_COUNT_TARGET

while i < POINTS_COUNT_TARGET:
    i = i + 1
    target = random.choice(targets)
    point = (point + target) / 2
    X.append(point[0])
    Y.append(point[1])
    Z.append(point[2])

    if (i % ITERATIONS_BETWEEN_DISPLAY_UPDATES) == 0:  # this is an opt to update the display less frequently
        print("i=",i," making numpy arrays. point=",point)
        ax.scatter3D(np.array(X), np.array(Y), np.array(Z), s=.1, c='black', alpha=.1)  # "s" is the size (diameter) of point
        plt.draw()
        plt.pause(.2)


    #plt.show()


plt.pause(10)
