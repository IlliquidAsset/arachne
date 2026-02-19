import { createRouter, handleRequest } from "./router"

const PORT = Number(process.env["ARACHNE_WEB_PORT"] ?? 3100)

const router = createRouter()

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		return handleRequest(request, router)
	},
})

console.log(`Arachne web server running on http://localhost:${server.port}`)
