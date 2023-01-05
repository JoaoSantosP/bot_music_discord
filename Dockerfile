FROM node:alpine

WORKDIR /app

COPY ../bot_music /app/


RUN ["npm", "install"]

CMD ["npm", "start"]