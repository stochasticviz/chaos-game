import pygame
from pygame import gfxdraw
import random

pygame.init()
pygame.display.set_caption('Quick Start')
surface = pygame.display.set_mode((800, 600))
background = pygame.Surface((800, 600))
background.fill(pygame.Color('#000000'))
is_running = True

x=10
y=100
color = (220,220,254)
targets = [(400, 0), (0, 599), (799,599)]
point = (100,100)
i = 0
while is_running:
     for event in pygame.event.get():
        if event.type == pygame.QUIT:
            is_running = False
     surface.set_at(point, color)
     target = random.choice(targets)
     point = (int((point[0]+target[0])/2) , int((point[1]+target[1])/2))
     i = i + 1
     if (i % 100) == 0:
        pygame.display.update()
