// my-app/config/api.js
import axios from "axios";
import { BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

export default API;
