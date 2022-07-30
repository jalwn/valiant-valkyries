# Valiant Valkyries

## Delete this later
change origin url before pulling bcs I changed the repo name

`git remote set-url origin new.git.url/here`

## Brief summary

## How to enter dev evironment, install dependencies, and start applications

1. [install poetry](https://python-poetry.org/docs/master/#installing-with-the-official-installer)

2.  change config for venv to be created in project instead of cache folder
    ```sh
    poetry config virtualenvs.in-project true
    ```
    this helps with vscode auto completion

3. run `poetry install` to install dependencies

4. run `poetry run api` to run the game

4. visit `http://127.0.0.1:8000/game/` to play

## Gamplay guide

## Screenshots
