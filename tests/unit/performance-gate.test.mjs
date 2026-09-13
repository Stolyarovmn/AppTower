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

test("median regression fails immediately without confirmation by default", () => {
  assert.deepEqual(
    evaluatePerformanceGate({medianMs:130, p95Ms:150}, limits),
    {pass:false, confirm:false, reason:"median"}
  );
});

test("startup median regression may require one independent confirmation batch", () => {
  const options = {confirmMedian:true};
  assert.deepEqual(
    evaluatePerformanceGate({medianMs:177.63, p95Ms:229.56}, {medianLimitMs:172.5165, p95LimitMs:260}, options),
    {pass:false, confirm:true, reason:"median"}
  );
  assert.deepEqual(
    confirmPerformanceGate(
      {medianMs:177.63, p95Ms:229.56},
      {medianMs:128.4, p95Ms:146.2},
      {medianLimitMs:172.5165, p95LimitMs:260},
      options
    ),
    {pass:true, confirm:false, reason:"transient-median"}
  );
});

test("repeated startup median regression still fails after confirmation", () => {
  const options = {confirmMedian:true};
  assert.deepEqual(
    confirmPerformanceGate(
      {medianMs:177.63, p95Ms:229.56},
      {medianMs:181.2, p95Ms:233.4},
      {medianLimitMs:172.5165, p95LimitMs:260},
      options
    ),
    {pass:false, confirm:false, reason:"median"}
  );
});
