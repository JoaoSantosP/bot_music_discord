FROM node:alpine

WORKDIR /app

COPY ./bot_music .


RUN ["npm", "install"]

CMD ["npm", "start"]