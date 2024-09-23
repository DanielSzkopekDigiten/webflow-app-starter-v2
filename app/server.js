import Webflow from "webflow-api";
import App from "./webflow.js";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import url from "url";

// Load environment variables from .env file
//const { WEBFLOW_CLIENT_ID, WEBFLOW_SECRET, SERVER_HOST, PORT } = process.env;
const { WEBFLOW_CLIENT_ID, WEBFLOW_SECRET, SERVER_HOST, PORT } = {client: '45d61566bacc0731afab494c89e02c063a286a15bd2d5fb371646dc24463ec1f', secret:  'a7f04bfa679e9a268805efcf80509f5eb69a5342dda9239ace0bc9ec9ebf0df0', host: 'https://88f9-79-188-78-79.ngrok-free.app', port: 3000};

// Create a new Webflow App instance
const app = new App(WEBFLOW_CLIENT_ID, WEBFLOW_SECRET);

// Instantiate Fastify server
const server = Fastify({
  logger: true,
});

// Response to Webhooks
server.post("/webhook", async (req, reply) => {
  // verify the webhook signature
  const valid = app.verifyRequest(req.headers, req.body);
  if (!valid) return reply.status(401).send("Invalid request");

  // Get site ID from webhook payload
  const { site } = req.body;

  // Get the site's access token
  const token = await app.data.get(site);

  // Initialize a new Webflow client
  const webflow = new Webflow({ token });

  // Make calls to the Webflow API
  const user = await webflow.get("/user");
  // Do other stuff with the API...

  // Return a 200 response to Webflow
  reply.statusCode = 200;
});

// If we recieve a get request to the root (localhost:5500) then the server will route to the static index page
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

server.register(fastifyStatic, {
  root: path.join(__dirname, "static"),
});

server.get("/", async (req, reply) => {
  await reply.sendFile("index.html");
});

// If we recieve a get request to /auth then the server will install our App via OAuth
server.get("/auth", async (req, reply) => {
  const { code } = req.query;

  // If a code is passed in, attempt to install the App
  // othersise, redirect to the install URL to start OAuth

  if (code) {
    // install the App and get and store an access token
    const token = await app.install(code);
    const test = await app.storeToken(token);

    console.log("\n\n\n\n");
    console.log("This is your ACCESS_TOKEN:");
    console.log(token);
    console.log("\n\n\n\n");

    return reply.sendFile("index.html");
  } else {
    // Generate a URL for a user to install the App on Webflow
    const installUrl = app.installUrl();

    // Redirect the user to the install URL
    return reply.redirect(installUrl);
  }
});

// List Sites
server.get("/sites", async (req, reply) => {
  const token = await app.getToken(); // get token from database

  const webflow = new Webflow({ token });
  const sites = await webflow.get("/beta/sites");

  return sites;
});

server.listen({ port: 3000, host: "localhost" }, (err) => {
  if (err) throw err;
});
