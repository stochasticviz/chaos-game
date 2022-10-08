
'''
Makes a 3D sierpinski triangle.


This worked for me 2022-10-07:
conda create -c conda-forge -n pygame_1 python=3.10  #
conda activate pygame_1
python -m pip install pygame

# INSTALL PYGAME  (the first 3 steps worked to run the other script, triangle.py)
conda create -c conda-forge -n pygame_1 python=3.10
conda activate pygame_1
python -m pip install pygame
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

i = 0
size = (1500, 1500, 1500)

targets = (np.array([0, 0, 0]), np.array([x(size), 0, 0]), np.array([0, y(size), 0]), np.array([x(size), y(size), 0]), np.array([x(size)/2, y(size)/2, z(size)]))

point = np.array((100,100,100))

X = []
Y = []
Z = []

while i < 100000:
     target = random.choice(targets)
     point = (point + target) / 2
     i = i + 1
     X.append(point[0])
     Y.append(point[1])
     Z.append(point[2])

X = np.array(X).astype(float)
Y = np.array(Y).astype(float)
Z = np.array(Z).astype(float)

fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection='3d')

ax.scatter3D(X, Y, Z, s=1, c='black', alpha=.2)
plt.show()
import time
time.sleep(5)
