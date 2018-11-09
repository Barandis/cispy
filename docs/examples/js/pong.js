const { go, put, take, sleep, chan, close, CLOSED } = cispy;
const table = chan();

async function main() {
  const ball = { hits: 0 };
  go(player, 'ping');
  go(player, 'pong');

  await put(table, ball);
  await sleep(10000);
  close(table);
}

async function player(name) {
  for (;;) {
    const ball = await take(table);
    if (ball === CLOSED) {
      console.log(`${name} finished.`);
      break;
    }
    ball.hits++;
    console.log(`${name}: ${ball.hits}`);
    await sleep(500);
    await put(table, ball);
  }
}

go(main);
