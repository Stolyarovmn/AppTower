import test from "node:test";
import assert from "node:assert/strict";
import {confirmPerformanceGate, evaluatePerformanceGate} from "../e2e/performance-gate.mjs";

const limits = {medianLimitMs:118.584, p95LimitMs:184.0725};

test("isolated hosted-runner p95 spike requests confirmation instead of failing immediately", () => {
  assert.deepEqual(
    evaluatePerformanceGate({medianMs:71.27, p95Ms:194.6}, limits),
    {pass:false, confirm:true, reason:"p95"}
  );
  assert.deepEqual(
    confirmPerformanceGate(
      {medianMs:71.27, p95Ms:194.6},
      {medianMs:66.38, p95Ms:80.59},
      limits
    ),
    {pass:true, confirm:false, reason:"transient-p95"}
  );
});

test("sustained p95 regression still fails after confirmation", () => {
  assert.deepEqual(
    confirmPerformanceGate(
      {medianMs:71.27, p95Ms:194.6},
      {medianMs:73.1, p95Ms:201.4},
      limits
    ),
    {pass:false, confirm:false, reason:"p95"}
  );
});

test("median regression fails immediately without confirmation", () => {
  assert.deepEqual(
    evaluatePerformanceGate({medianMs:130, p95Ms:150}, limits),
    {pass:false, confirm:false, reason:"median"}
  );
});
