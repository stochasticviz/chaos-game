## Archived web apps

### 3D HTML page
[chaos-game-3d.html](chaos-game-3d.html)

Old version of 3D HTML which was vibeforked (vibeported?) off from a version of the 2D code before MathJS programmability was added. Note this does imports:

```
import * as THREE from '../../web/lib/three/0.172.0/three.module.js';
import { OrbitControls } from '../../web/lib/three/0.172.0/examples/jsm/controls/OrbitControls.js';
```
... and that those modules are found elsewhere in the repo. For development this was used:

```
nvm use 23.7.0
npx http-server -c=-1
```
