import http from "http";
import app from "./app.js";
import { PORT } from "./config.js";


const server = http.createServer(app);


//STARTING AND RUNNING THE SERVER//
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
