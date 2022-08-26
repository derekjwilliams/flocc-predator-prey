import {
  Agent,
  Environment,
  LineChartRenderer,
  CanvasRenderer,
  Terrain,
  Colors,
  utils
} from "flocc";

const goatReproductionEnergyMinimum = 840;
const energyGainedByGoatConsumingPlants = 28;
const reproductionLikelihoodForGoat = 0.03;
const maximumNumberOfGoats = 120000;

const sheepReproductionEnergyMinimum = 1840;
const energyGainedBySheepConsumingPlants = 50;
const reproductionLikelihoodForSheep = 0.032;
const maximumNumberOfSheep = 120000;

const reproductionLikelihoodForWolf = 0.1;
const energyGainedByWolfFromConsumingSheep = 20;
const energyGainedByWolfFromConsumingGoat = 25;
const wolfPredationRadius = 28;
const wolfReproductionEnergyMinimum = 40;

const width = 1500;
const height = 500;

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
  widt: 600,
  height: 400
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
    energy: Math.random() * 2 * energyGainedByGoatConsumingPlants,
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
    size: 1.8,
    energy: Math.random() * 2 * energyGainedBySheepConsumingPlants,
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
      energy: Math.random() * 2 * energyGainedByWolfFromConsumingSheep,
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
  if (agent.get("energy") < 20) {
    removeGoat(agent);
  }
  const { x, y } = agent.getData();
  const grass = terrain.sample(x, y).g;
  if (grass > 0) {
    const amountToEat = Math.min(energyGainedByGoatConsumingPlants, grass);
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
  if ((agent.get("energy") > goatReproductionEnergyMinimum) && (Math.random() < reproductionLikelihoodForGoat)) {
    agent.set("energy", agent.get("energy") / 3);
    addGoat();
  }
}

function tickSheep(agent) {
  moveSheep(agent);
  agent.decrement("energy");
  if (agent.get("energy") < 20) removeSheep(agent);
  const { x, y } = agent.getData();
  const grass = terrain.sample(x, y).g;
  if (grass > 0) {
    const amountToEat = Math.min(energyGainedBySheepConsumingPlants, grass);
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
  if ((agent.get("energy") > sheepReproductionEnergyMinimum) && (Math.random() < reproductionLikelihoodForSheep)) {
    agent.set("energy", agent.get("energy") / 3);
    addSheep();
  }
}

function moveWolf(agent) {
  agent.increment("x", utils.random(-10, 10));
  agent.increment("y", utils.random(-10, 10));
}

function tickWolf(agent) {
  moveWolf(agent);
  agent.decrement("energy");
  if (agent.get("energy") < energyGainedByWolfFromConsumingGoat) {
    environment.removeAgent(agent);
    environment.decrement("wolves");
  }

  // at all wolf locations
  let goatHere = [];
  let sheepHere = [];
  // debugger
  console.log("wolf energy:", agent.get("energy"))
  const adjustedWolfPredationRadius = wolfPredationRadius;// * (agent.get("energy") / 2)
  for (let y = agent.get("y") - adjustedWolfPredationRadius; y < agent.get("y") + adjustedWolfPredationRadius; y++) {
    for (let x = agent.get("x") - adjustedWolfPredationRadius; x < agent.get("x") + adjustedWolfPredationRadius; x++) {
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
  if (goatHere.length !== 0 || sheepHere.length !== 0) {
    let eatSheep = sheepHere.length !== 0
    let eatGoat = goatHere.length !== 0
    if (eatGoat && eatSheep) { // randomly pick one if there are both at the location
      if (0.3 < Math.random()) { // goats are more nimble, i.e. can run faster than sheep
        eatGoat
      } else {
        eatSheep
      }
    }
    if (eatSheep) {
      removeSheep(environment.getAgentById(utils.sample(sheepHere)))
      agent.increment("energy", energyGainedByWolfFromConsumingSheep)
      if (agent.get("energy") > wolfReproductionEnergyMinimum && Math.random() < reproductionLikelihoodForWolf) {
        agent.set("energy", agent.get("energy") / 2);
        addWolf();
      }
    }
    if (eatGoat) {
      removeGoat(environment.getAgentById(utils.sample(goatHere)))
      agent.increment("energy", energyGainedByWolfFromConsumingGoat)
      if (agent.get("energy") > wolfReproductionEnergyMinimum &&  Math.random() < reproductionLikelihoodForWolf) {
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
  if (environment.get("goat") >= maximumNumberOfGoats) {
    window.alert("The goat have inherited the earth!");
  }
  if (environment.get("sheep") >= maximumNumberOfSheep) {
    window.alert("The sheep have inherited the earth!");
  }
  else if (environment.time < 3000) {
    requestAnimationFrame(run);
  }
}

setup();
run();