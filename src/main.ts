// todo
import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;

const button = document.createElement("button");
button.innerHTML = "button";
app.appendChild(button);

button.addEventListener("click", () => alert("you clicked the button!"));
