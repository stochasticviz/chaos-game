# AGENTS.md

## Relevant files
- Only these files in the repo are relevant to your tasks:
  - web/chaos-game-3d.html
  - web/static/chaos-game-3d.js
  - web/static/points-on-n-sphere.js
  - web/static/polytopes.js
  - web/static/chaos-game.css
- Ignore the 2D stuff

## Try out your code
- Dev servers block the shell and another subsequent commands, so always run them in the background. Start the web app in the background in the root directory of the project:
python3 -m http.server 8910 & SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT


## Try out your code
- Dev servers block the terminal, so always run them **in the background**. From the **project root**, start the local web server in a **disposable shell**:
  ```bash
  python3 -m http.server 8910 &
  SERVER_PID=$!
  trap "kill $SERVER_PID 2>/dev/null || true" EXIT
  ```
It will be immediately available. Do not reuse that shell after you complete your task. The trap command will clean things up when you quit the shell.
- then use the Playwright MCP server to go to this URL to try your functionality:
http://127.0.0.1:8910/web/chaos-game-3d.html


## git
- If I ask you to commit, then include your name at the bottom of the commit msg.
- Do not 'git push'.
