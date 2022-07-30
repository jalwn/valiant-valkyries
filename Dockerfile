FROM 3.10.5-slim-buster
WORKDIR /valiant-valkyries
COPY ./requirements.txt /valiant-valkyries/requirements.txt
RUN pip3 install -r requirements.txt
COPY . .
RUN pip install --no-cache-dir --upgrade -r /valkyries/requirements.txt
COPY ./backend /valiant-valkyries/backend
COPY ./frontend /valiant-valkyries/frontend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "80"]
