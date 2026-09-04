import test from "node:test";
import assert from "node:assert/strict";
import {createMutationCoordinator} from "../../app/shared/mutation-coordinator.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("mutations never interleave even when earlier work awaits", async () => {
  const coordinator = createMutationCoordinator();
  const trace = [];

  const first = coordinator.enqueue("first", async () => {
    trace.push("first:start");
    await delay(25);
    trace.push("first:end");
    return 1;
  });
  const second = coordinator.enqueue("second", async () => {
    trace.push("second:start");
    await delay(1);
    trace.push("second:end");
    return 2;
  });

  assert.deepEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepEqual(trace, [
    "first:start",
    "first:end",
    "second:start",
    "second:end"
  ]);
});

test("a failed mutation does not poison following mutations", async () => {
  const coordinator = createMutationCoordinator();
  const trace = [];

  await assert.rejects(
    coordinator.enqueue("broken", async () => {
      trace.push("broken");
      throw new Error("boom");
    }),
    /boom/
  );

  const value = await coordinator.enqueue("recovery", async () => {
    trace.push("recovery");
    return 42;
  });

  assert.equal(value, 42);
  assert.deepEqual(trace, ["broken", "recovery"]);
});

test("whenIdle waits for the complete queued operation set", async () => {
  const coordinator = createMutationCoordinator();
  let completed = 0;

  void coordinator.enqueue("one", async () => {
    await delay(10);
    completed += 1;
  });
  void coordinator.enqueueRead("read", async () => {
    await delay(10);
    completed += 1;
  });

  assert.equal(coordinator.snapshot().pending, 2);
  assert.equal(coordinator.snapshot().queued, 2);
  await coordinator.whenIdle();
  assert.equal(completed, 2);
  assert.equal(coordinator.snapshot().pending, 0);
  assert.equal(coordinator.snapshot().queued, 0);
  assert.equal(coordinator.snapshot().active, null);
});

test("queue diagnostics include waiting work while one mutation is active", async () => {
  const events = [];
  const coordinator = createMutationCoordinator({onEvent:event => events.push(event)});
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });

  const first = coordinator.enqueue("first", async () => {
    await firstGate;
  });
  const second = coordinator.enqueue("second", async () => undefined);

  await delay(5);
  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.pending, 2);
  assert.equal(snapshot.queued, 1);
  assert.equal(snapshot.active?.label, "first");
  assert.equal(snapshot.active?.kind, "mutation");

  releaseFirst();
  await Promise.all([first, second]);

  const enqueues = events.filter(event => event.phase === "enqueue");
  assert.deepEqual(enqueues.map(event => [event.label,event.kind,event.pending]), [
    ["first","mutation",1],
    ["second","mutation",2]
  ]);
  assert.ok(events.some(event => event.phase === "start" && event.label === "first" && event.queued === 1));
});

test("diagnostic events preserve mutation sequence", async () => {
  const events = [];
  const coordinator = createMutationCoordinator({onEvent:event => events.push(event)});

  await coordinator.enqueue("alpha", async () => "ok");
  await coordinator.enqueue("beta", async () => "ok");

  const starts = events.filter(event => event.phase === "start");
  const commits = events.filter(event => event.phase === "commit");
  assert.deepEqual(starts.map(event => [event.id,event.label,event.kind]), [
    [1,"alpha","mutation"],
    [2,"beta","mutation"]
  ]);
  assert.deepEqual(commits.map(event => event.id), [1,2]);
});

test("serialized reads observe the state after earlier mutation commit", async () => {
  const coordinator = createMutationCoordinator();
  const trace = [];
  let state = "before";

  const mutation = coordinator.enqueue("persist-workspace", async () => {
    trace.push("mutation:start");
    await delay(20);
    state = "after";
    trace.push("mutation:commit");
  });

  const read = coordinator.enqueueRead("get-state", async () => {
    trace.push(`read:${state}`);
    return state;
  });

  assert.equal(await read, "after");
  await mutation;
  assert.deepEqual(trace, ["mutation:start","mutation:commit","read:after"]);
});

test("reads and mutations share one FIFO order without fake read commits", async () => {
  const events = [];
  const trace = [];
  const coordinator = createMutationCoordinator({onEvent:event => events.push(event)});

  const first = coordinator.enqueue("write-1", async () => trace.push("write-1"));
  const read = coordinator.enqueueRead("read-1", async () => trace.push("read-1"));
  const second = coordinator.enqueue("write-2", async () => trace.push("write-2"));

  await Promise.all([first, read, second]);

  assert.deepEqual(trace,["write-1","read-1","write-2"]);
  assert.deepEqual(
    events.filter(event => event.phase === "commit").map(event => event.label),
    ["write-1","write-2"]
  );
  assert.deepEqual(
    events.filter(event => event.phase === "read").map(event => event.label),
    ["read-1"]
  );
});
