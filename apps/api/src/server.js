import { createServer } from "node:http";
import { requestHandler } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const server = createServer(requestHandler);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
