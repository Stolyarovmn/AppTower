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

test("whenIdle waits for the complete queued mutation set", async () => {
  const coordinator = createMutationCoordinator();
  let completed = 0;

  void coordinator.enqueue("one", async () => {
    await delay(10);
    completed += 1;
  });
  void coordinator.enqueue("two", async () => {
    await delay(10);
    completed += 1;
  });

  await coordinator.whenIdle();
  assert.equal(completed, 2);
  assert.equal(coordinator.snapshot().pending, 0);
  assert.equal(coordinator.snapshot().active, null);
});

test("diagnostic events preserve mutation sequence", async () => {
  const events = [];
  const coordinator = createMutationCoordinator({onEvent:event => events.push(event)});

  await coordinator.enqueue("alpha", async () => "ok");
  await coordinator.enqueue("beta", async () => "ok");

  const starts = events.filter(event => event.phase === "start");
  const commits = events.filter(event => event.phase === "commit");
  assert.deepEqual(starts.map(event => [event.id,event.label]), [[1,"alpha"],[2,"beta"]]);
  assert.deepEqual(commits.map(event => event.id), [1,2]);
});
