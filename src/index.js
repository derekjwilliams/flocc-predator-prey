import {
  Agent,
  Environment,
  LineChartRenderer,
  CanvasRenderer,
  Terrain,
  Colors,
  utils
} from "flocc";

const SHEEP_GAIN_FROM_FOOD = 10;
const WOLF_GAIN_FROM_FOOD = 20;
const SHEEP_REPRODUCE = 0.03;
const WOLF_REPRODUCE = 0.1;
const MAX_SHEEP = 6000;

const width = 600;
const height = 300;

const sheepLocations = new Array(width * height);

const environment = new Environment({ width, height });
const renderer = new CanvasRenderer(environment, {
  background: "green",
  width,
  height
});
renderer.mount("#container");

const { GREEN } = Colors;
const terrain = new Terrain(width, height, {
  async: true
});
terrain.init(() => GREEN);
terrain.addRule((x, y) => {
  const { g } = terrain.sample(x, y);
  terrain.set(x, y, GREEN.r, Math.min(GREEN.g, g + 1), GREEN.b, GREEN.a);
});
environment.use(terrain);

const chart = new LineChartRenderer(environment, {
  autoScale: true,
  height: 200
});
chart.metric("sheep", {
  fn: utils.sum,
  color: "blue"
});
chart.metric("wolf", {
  fn: utils.sum,
  color: "red"
});
chart.mount("#population");

function addSheep() {
  const sheep = new Agent({
    color: "white",
    size: 1.5,
    energy: Math.random() * 2 * SHEEP_GAIN_FROM_FOOD,
    x: utils.random(0, width),
    y: utils.random(0, height),
    sheep: 1,
    tick: tickSheep
  });
  environment.increment("sheep");
  environment.addAgent(sheep);
  sheepLocations[sheep.get("x") + sheep.get("y") * width] = sheep.id;
}

function removeSheep(agent) {
  environment.removeAgent(agent);
  environment.decrement("sheep");
  sheepLocations[agent.get("x") + agent.get("y") * width] = false;
}

function addWolf() {
  environment.increment("wolves");
  environment.addAgent(
    new Agent({
      color: "#aaaaaa",
      size: 4,
      energy: Math.random() * 2 * WOLF_GAIN_FROM_FOOD,
      x: utils.random(0, width),
      y: utils.random(0, height),
      wolf: 1,
      tick: tickWolf
    })
  );
}

function move(agent) {
  if (agent.get("sheep")) {
    const { x, y } = agent.getData();
    sheepLocations[x + y * width] = 0;
  }
  agent.increment("x", utils.random(-3, 3));
  agent.increment("y", utils.random(-3, 3));
  if (agent.get("sheep")) {
    const { x, y } = agent.getData();
    sheepLocations[x + y * width] = agent.id;
  }
}

function tickSheep(agent) {
  move(agent);
  agent.decrement("energy");
  if (agent.get("energy") < 0) removeSheep(agent);
  const { x, y } = agent.getData();
  const grass = terrain.sample(x, y).g;
  if (grass > 0) {
    const amountToEat = Math.min(SHEEP_GAIN_FROM_FOOD, grass);
    agent.increment("energy", amountToEat);
    [-1, 0, 1].forEach((_y) => {
      [-1, 0, 1].forEach((_x) => {
        const { r, g, b, a } = terrain.sample(x + _x, y + _y);
        terrain.set(x + _x, y + _y, r, g - 15, b, a);
      });
    });
    terrain.set(x, y, grass - 8 * amountToEat);
  }
  // reproduce
  if (Math.random() < SHEEP_REPRODUCE) {
    agent.set("energy", agent.get("energy") / 2);
    addSheep();
  }
}

function tickWolf(agent) {
  move(agent);
  agent.decrement("energy");
  if (agent.get("energy") < 0) {
    environment.removeAgent(agent);
    environment.decrement("wolves");
  }
  const here = [];
  const r = 6;
  for (let y = agent.get("y") - r; y < agent.get("y") + r; y++) {
    for (let x = agent.get("x") - r; x < agent.get("x") + r; x++) {
      const index =
        (x < 0 ? x + width : x >= width ? x - width : x) +
        (x < 0 ? y + height : y >= height ? y - height : y) * width;
      const sheep = sheepLocations[index];
      if (sheep) here.push(sheep);
    }
  }
  if (here.length === 0) return;
  removeSheep(environment.getAgentById(utils.sample(here)));
  agent.increment("energy", WOLF_GAIN_FROM_FOOD);
  // reproduce
  if (Math.random() < WOLF_REPRODUCE) {
    agent.set("energy", agent.get("energy") / 2);
    addWolf();
  }
}

function setup() {
  for (let i = 0; i < 300; i++) {
    addSheep();
  }
  for (let i = 0; i < 100; i++) {
    addWolf();
  }
}

function run() {
  environment.tick();
  if (environment.get("sheep") >= MAX_SHEEP) {
    window.alert("The sheep have inherited the earth!");
  } else if (environment.time < 3000) {
    requestAnimationFrame(run);
  }
}

setup();
run();
