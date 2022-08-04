# Valiant Valkyries

## Brief summary
This project is a 2-D web game inspired by the classic Snake game but with some new exciting twists.
The goal of the game is to to stay alive as long as possible by eating different foods and staying away from the poison wall.
You can also save your game score and compare with others on the leaderboard.

We have used python for the backend, javascript for the frontend and websockets as the communication protocol.
It uses the [uvicorn](https://www.uvicorn.org/) library as the server application and the [fastapi](https://fastapi.tiangolo.com/) library for serving api calls.

## Development

1. Install [poetry](https://python-poetry.org/docs/master/#installing-with-the-official-installer)

2. Change config for venv to be created in project instead of cache folder
   ```sh
   poetry config virtualenvs.in-project true
   ```
   This helps with vscode auto completion.

3. Run `poetry install` to install dependencies.

4. Run `poetry run game` to run the game.

4. Visit `http://127.0.0.1:8000/game/` to play.

## Gameplay guide
The player's character (the snake) is an unknown land where the poison causes it to starve, thus depleting in health - indicated by its length.
Moreover, there is a poison wall at the edge of the game screen.
The player must prevent the death of the snake by keeping away from the edge of the game and eating different foods.
The rate at which the snake loses health depends directly on the difficulty of the game
 
Currently, four foods are implemented:
1. Yellow bug: regenerates 1 health
2. Red bug: regenerates 3 health
3. Caterpillar: increases game difficulty (thus the snake loses health after longer intervals)
4. Butterfly: increases the snake length by a huge amount triggering some unexpected behaviour

## Code description
The backend code is implemented in `main.py` in `backend/`.
It defines multiple api methods that return different data like the food to spawn, difficulty of the game.
It contains algorithms to dynamically change difficulty, and randomly select a food item from a weighted random distributionm
The player can save their score which is written to a local `leaderboard.json` by the backend.
The webpage is served by the backend itself.

The frontend is implemented in `main.js` in `frontend/`.
It defines functions for starting the game, loading the images on the canvas and updating them.
It defines functions for detecting the collision of snake with wall, food with wall and snake with food.
Moreover, it updates the webpage layout on game start and game end.

The webpage `index.html` uses bootstrap for styling and google fonts for loading external fonts.
It uses a grid layout and some custom css in `index.css`.
A modal is displayed on the webpage on game start.

## Screenshots

![Project thumbnail picture](https://imgur.com/HepmLNH)

## Credits

### sounds used
1. https://opengameart.org/content/rpg-the-secret-within-the-woods
2. https://opengameart.org/content/rpg-sound-pack
3. https://opengameart.org/content/apple-bite
4. https://opengameart.org/content/8bit-death-whirl (death sound)
5. https://freesound.org/people/Slaking_97/sounds/455109/ (background music)
6. https://opengameart.org/content/atmospheric-interaction-sound-pack (integer overflow from this pack)
7. https://orangefreesounds.com/potato-chip-crunch-single-bite/ (eat sound)
