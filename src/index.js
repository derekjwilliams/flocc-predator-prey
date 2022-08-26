import {
  Agent,
  Environment,
  LineChartRenderer,
  CanvasRenderer,
  Terrain,
  Colors,
  utils
} from "flocc";

const GOAT_GAIN_FROM_FOOD = 11;
const GOAT_REPRODUCE = 0.03;
const MAX_GOAT = 6000;

const SHEEP_GAIN_FROM_FOOD = 10;
const SHEEP_REPRODUCE = 0.03;
const MAX_SHEEP = 6000;

const WOLF_REPRODUCE = 0.2;
const WOLF_GAIN_FROM_FOOD = 20;

const width = 600;
const height = 300;

const goatLocations = new Array(width * height);
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
  color: "yellowgreen"
});
chart.metric("goat", {
  fn: utils.sum,
  color: "blue"
});
chart.metric("wolf", {
  fn: utils.sum,
  color: "red"
});
chart.mount("#population");

function addGoat() {
  const goat = new Agent({
    color: "blue",
    size: 1.5,
    energy: Math.random() * 2 * GOAT_GAIN_FROM_FOOD,
    x: utils.random(0, width),
    y: utils.random(0, height),
    goat: 1,
    tick: tickGoat
  });
  environment.increment("goat");
  environment.addAgent(goat);
  goatLocations[goat.get("x") + goat.get("y") * width] = goat.id;
}

function addSheep() {
  const animal = new Agent({
    color: "yellowgreen",
    size: 1.5,
    energy: Math.random() * 2 * SHEEP_GAIN_FROM_FOOD,
    x: utils.random(0, width),
    y: utils.random(0, height),
    sheep: 1,
    tick: tickSheep
  });
  environment.increment("sheep");
  environment.addAgent(animal);
  sheepLocations[animal.get("x") + animal.get("y") * width] = animal.id;
}

function removeGoat(agent) {
  environment.removeAgent(agent);
  environment.decrement("goat");
  goatLocations[agent.get("x") + agent.get("y") * width] = false;
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
      color: "red",
      size: 2,
      energy: Math.random() * 2 * WOLF_GAIN_FROM_FOOD,
      x: utils.random(0, width),
      y: utils.random(0, height),
      wolf: 1,
      tick: tickWolf
    })
  );
}
function moveGoat(agent) {
  if (agent.get("goat")) {
    const { x, y } = agent.getData();
    goatLocations[x + y * width] = 0;
    agent.increment("x", utils.random(-3, 3));
    agent.increment("y", utils.random(-3, 3));
    const data = agent.getData();
    goatLocations[data.x + data.y * width] = agent.id;
  }
}
function moveSheep(agent) {
  if (agent.get("sheep")) {
    const { x, y } = agent.getData();
    sheepLocations[x + y * width] = 0;
    agent.increment("x", utils.random(-3, 3));
    agent.increment("y", utils.random(-3, 3));
    const data = agent.getData();
    sheepLocations[data.x + data.y * width] = agent.id;
  }
}

function tickGoat(agent) {
  moveGoat(agent);
  agent.decrement("energy");
  if (agent.get("energy") < 0) {
    removeGoat(agent);
  }
  const { x, y } = agent.getData();
  const grass = terrain.sample(x, y).g;
  if (grass > 0) {
    const amountToEat = Math.min(GOAT_GAIN_FROM_FOOD, grass);
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
  if (Math.random() < GOAT_REPRODUCE) {
    agent.set("energy", agent.get("energy") / 2);
    addGoat();
  }
}

function tickSheep(agent) {
  moveSheep(agent);
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

function moveWolf(agent) {
  agent.increment("x", utils.random(-3, 3));
  agent.increment("y", utils.random(-3, 3));
}

function tickWolf(agent) {
  moveWolf(agent);
  agent.decrement("energy");
  if (agent.get("energy") < 0) {
    environment.removeAgent(agent);
    environment.decrement("wolves");
  }

  // at all wolf locations
  let goatHere = [];
  let sheepHere = [];
  const r = 6;
  for (let y = agent.get("y") - r; y < agent.get("y") + r; y++) {
    for (let x = agent.get("x") - r; x < agent.get("x") + r; x++) {
      const index =
        (x < 0 ? x + width : x >= width ? x - width : x) +
        (x < 0 ? y + height : y >= height ? y - height : y) * width;
      const goat = goatLocations[index]; // is not false if there is a goat at the wolf's location
      if (goat) {
        goatHere.push(goat);
      }
      const sheep = sheepLocations[index];
      if (sheep) {
        sheepHere.push(sheep)
      }
    }
  }
  if (goatHere.length === 0 && sheepHere.length === 0) { 
    return; // no prey here
  }

  // otherwise wolf gets to eat a sheep or a goat
  const random = Math.random();
  if (random < 0.5) {
    if (sheepHere.length) {
      removeSheep(environment.getAgentById(utils.sample(sheepHere)))
      agent.increment("energy", WOLF_GAIN_FROM_FOOD)
      if (Math.random() < WOLF_REPRODUCE) {
        agent.set("energy", agent.get("energy") / 2);
        addWolf();
      }
    }
  } 

  else {
    if (goatHere.length) {
      removeGoat(environment.getAgentById(utils.sample(goatHere)))
      agent.increment("energy", WOLF_GAIN_FROM_FOOD)
      if (Math.random() < WOLF_REPRODUCE) {
        agent.set("energy", agent.get("energy") / 2);
        addWolf();
      }
    }
  }
}

function setup() {
  for (let i = 0; i < 300; i++) {
    addSheep();
  }
  for (let i = 0; i < 300; i++) {
    addGoat();
  }
  for (let i = 0; i < 100; i++) {
    addWolf();
  }
}

function run() {
  environment.tick();
  if (environment.get("goat") >= MAX_GOAT) {
    window.alert("The goat have inherited the earth!");
  } 
  if (environment.get("sheep") >= MAX_SHEEP) {
    window.alert("The sheep have inherited the earth!");
  } 
  else if (environment.time < 3000) {
    requestAnimationFrame(run);
  }
}

setup();
run();