import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTokens,formatTokenEstimate,usdCents} from './tokenEstimate.ts';

test('calculates USD / market price and floors fractional base units',()=>{
  assert.equal(estimateTokens('100','0.3334'),'299.940011997600479904');
  assert.equal(estimateTokens('1','3'),'0.333333333333333333');
  assert.equal(estimateTokens('1,50','0.25'),'6');
  assert.equal(estimateTokens('0.01','0.000000001'),'10000000');
  assert.equal(estimateTokens('10','1'),'10');
  assert.equal(estimateTokens('1','3',0),null);
});

test('keeps large and very small prices exact without floating point',()=>{
  assert.equal(estimateTokens('10000.00','0.000000000000000000000001'),'10000000000000000000000000000');
  assert.equal(estimateTokens('0.01','10000000000000000'),'0.000000000000000001');
  assert.equal(estimateTokens('0.01','10000000000000001'),null);
});

test('rejects malformed input and nonpositive or unsupported prices',()=>{
  for(const value of ['', '-10','1e3','Infinity','1,000.00','1.001','1..2','12 USD'])assert.equal(estimateTokens(value,'1'),null,value);
  for(const value of ['0','-1','NaN','1e-4','Infinity','0.0000000000000000000000001'])assert.equal(estimateTokens('100',value),null,value);
  assert.equal(usdCents(' 001,20 '),120n);
  assert.equal(usdCents('١٢٫٥٠'),1250n);
  assert.equal(usdCents('۱۲٫۵۰'),1250n);
  assert.equal(usdCents('１２,５０'),1250n);
  assert.equal(usdCents('١٬٠٠٠'),null);
  assert.equal(usdCents('0'),0n);
  assert.equal(estimateTokens('0','1'),null);
});

test('formats a readable localized preview without rounding up or displaying a positive amount as zero',()=>{
  assert.equal(formatTokenEstimate('299.940011997600479904','es'),'299,940011');
  assert.equal(formatTokenEstimate('10000.123456789','en'),'10,000.123456');
  assert.equal(formatTokenEstimate('0.000000000000000001','en'),'0.000000000000000001');
  assert.equal(formatTokenEstimate('10000000000000000000000000000','en'),'10,000,000,000,000,000,000,000,000,000');
});
