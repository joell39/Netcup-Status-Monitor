FROM alpine:latest as builder

# Prerequisites
RUN apk update && apk add nodejs npm && rm -rf /var/cache/apk/*
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .


FROM alpine:latest as runner

# Prerequisites
RUN apk update && apk add nodejs npm && rm -rf /var/cache/apk/*
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Copy files from build stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY package*.json ./
COPY index.js ./

CMD [ "node", "index.js" ]