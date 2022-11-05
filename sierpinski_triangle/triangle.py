'''
Makes a (2D) sierpinski triangle.

This worked for me 2022-10-07:
# INSTALL PYGAME
conda create -c conda-forge -n pygame_1 python=3.10
conda activate pygame_1
python -m pip install pygame

# RUN IT:
python ./triangle.py

'''

import pygame
from pygame import gfxdraw
import random
import time

pygame.init()
pygame.display.set_caption('Quick Start')
surface = pygame.display.set_mode((800, 600))
background = pygame.Surface((800, 800))
background.fill(pygame.Color('#000000'))

is_running = True
color = (220,220,254)
#targets = [(400, 0), (0, 599), (799,599)]
#targets = ((0, 0), (0, 500), (500, 0), (500, 500), (0, 800),  (500, 800))
#targets =(
#(600,463),
#(500,463),
#(450,550),
#(500,637),
#(600,637),
#(650,550))


# use https://www.mathopenref.com/coordpolycalc.html  to find coordinates of polygon vertices
targets_6=((500,227),
(300,227),
(200,400),
(300,573),
(500,573),
(600,400))

targets_7=((400,100),
(165,213),
(108,467),
(270,670),
(530,670),
(692,467),
(635,213))

targets_8=((515,123),
(285,123),
(123,285),
(123,515),
(285,677),
(515,677),
(677,515),
(677,285))

targets_9=((400,100),
(207,170),
(105,348),
(140,550),
(297,682),
(503,682),
(660,550),
(695,348),
(593,170))

targets_3=((10,10),
(200,570),
(600,44))


POINTS_COUNT_TARGET = 200000
ITERATIONS_BETWEEN_DISPLAY_UPDATES=1000  # try 10 or 100

targets = targets_3
point = (100,100)
i = 0
while is_running:
     surface.set_at(point, color)
     target = random.choice(targets)
     point = (int((point[0]+target[0])/2) , int((point[1]+target[1])/2))
     i = i + 1
     if (i % ITERATIONS_BETWEEN_DISPLAY_UPDATES) == 0:  # this is an opt to update the display less frequently
        pygame.display.update()
        if (i % 10000) == 0:
            print("points count=",i)
     if i > POINTS_COUNT_TARGET:
         print ("done")
         time.sleep(10)
         is_running = False
     for event in pygame.event.get():
        if event.type == pygame.QUIT:
            is_running = False


# WIWL: continue adapting triangle_2d_holoviz.py to be friendly to holoviz. It's in http://localhost:8888/notebooks/Untitled3.ipynb?kernel_name=python3 currently. But... make "points count" a parameter of a function (going to need this code in there:  https://gis.stackexchange.com/questions/394955/generating-approximate-polygon-for-circle-with-given-radius-and-centre-without) and then it looks like I make that a live parameter exploration... variable? range?     https://holoviews.org/getting_started/Live_Data.html
