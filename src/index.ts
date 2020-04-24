import axios from 'axios';
import dotenv from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'http'
import DiscordBot from './DiscordBot'

const requestHandler = (request: IncomingMessage, response: ServerResponse) => {
  response.end('Interbus Bot!')
}

// azure app service needs to be able to ping us
const server = createServer(requestHandler)
const port = process.env.PORT ?? 80
// @ts-ignore
server.listen(port, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log(`Server listening on port ${port}`);
  }
});
// Run dotenv
dotenv.config();

axios.defaults.baseURL = process.env.API_BASE_URL;
axios.defaults.timeout = 5000; // 5s
axios.defaults.params = { code: process.env.API_KEY }

export default new DiscordBot().begin()