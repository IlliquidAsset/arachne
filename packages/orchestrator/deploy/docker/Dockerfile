# TODO: Docker deployment not implemented in v1
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "start"]
