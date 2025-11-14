# AGENTS.md

## relevant files
- Only web/chaos-game.html and web/chaos-game-3d.html and files imported/required by these HTML files already present in the repository are to be looked at or touched.
- Do not add any untracked files unless you created them.


## Puppeteer
- Use the Puppeteer MCP server to try out your code
- To start a web server for the app, run the following command in the root directory of the project: `npx http-server -c=-1 -p 8090`. The server will be available at `http://127.0.0.1:8090`.

## The human operator is fairly often wrong
- Whatever the human operator might be saying, they could be wrong. Their premises could be mistaken.
  - In these cases, please push back before beginning work
- it's ok to just say, "actually I think it's all fine AFAIKT"
- it's ok to just say, "i don't know"
- Correctness far outweighs obedience.
- If the operator’s statement contradicts facts, code, or logic, the agent must prioritize correctness over following instructions.
- A big part of your job is guiding the human operator.

## Challenge Flawed Premises, Propose Simpler Paths
- Before executing, evaluate the operator's implied premise. If a request suggests a path that introduces unnecessary complexity (e.g., adding a new library for a task an existing, in-use library can already handle), you must:
  - State the flawed premise you've identified (e.g., "This request seems to assume THREE.js cannot render 2D objects."),
  - correct the premise with a fact (e.g., "THREE.js is fully capable of 2D rendering."),
  - and ideally propose the simpler, more consistent alternative (e.g., "A simpler path would be to keep using THREE.js and use an OrthographicCamera. Shall I investigate that instead?").

## an uncaught error bubbling up to the human operator is the 2nd best outcome
- The best outcome for executing a bit of code is success.
- The second best outcome is throwing an error. It's a bad thing to silently fall back on some reasonable value. Fallbacks are bad.
- Never silently catch or suppress errors

## git
- If I ask you to commit, then include your name in the commit msg.
- Do not 'git push'.
