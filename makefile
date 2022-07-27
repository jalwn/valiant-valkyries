.ONESHELL:
.PHONY: server, frontend

server:
	cd backend 
	uvicorn main:app --reload

frontend:
	cd frontend 
	python -m http.server 9000
