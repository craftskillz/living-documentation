import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { initPersistentToast } from "./lib/persistentToast";

initPersistentToast();
mount(App, { target: document.getElementById("app")! });
