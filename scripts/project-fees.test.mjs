import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateProjectFees,proposedPolicy} from './simulate-project-fees.mjs';

const base={grossUsd:'100000.00',actualProcessorCostUsd:'1500.00',operatingBudgetUsd:'1500.00',roundState:'closed',coolingComplete:true,attributedSale:true,campaignQualified:true,volumeQualified:true};
const cents=value=>{const [whole,fraction]=value.split('.');return BigInt(whole)*100n+BigInt(fraction);};

test('fully qualified scenario balances issuer capital, commercial reserve and treasury',()=>{
  const result=simulateProjectFees(base);const m=result.amountsUsd;
  assert.equal(m.closingFee,'7880.00');assert.equal(m.projectCapital,'90620.00');
  assert.equal(m.directSale,'1970.00');assert.equal(m.campaignBonus,'394.00');assert.equal(m.volumeBonus,'394.00');
  assert.equal(m.commercialReserve,'2758.00');assert.equal(m.dracmaRetainedBeforeK,'5122.00');assert.equal(m.dracmaMarginAfterKBeforeTaxes,'3622.00');
  assert.equal(result.actualPaymentInstructionsGenerated,false);
});

test('unqualified bonuses remain funded in reserve instead of becoming payouts',()=>{
  const m=simulateProjectFees({...base,campaignQualified:false,volumeQualified:false}).amountsUsd;
  assert.equal(m.commercialQualified,'1970.00');assert.equal(m.commercialUnassignedReserve,'788.00');
  const unattributed=simulateProjectFees({...base,attributedSale:false}).amountsUsd;
  assert.equal(unattributed.commercialQualified,'0.00');assert.equal(unattributed.commercialUnassignedReserve,'2758.00');
});

test('open, cooling and cancelled scenarios preserve escrow and reveal gross-refund funding gap',()=>{
  for(const input of [{...base,roundState:'open'},{...base,coolingComplete:false},{...base,roundState:'cancelled'}]){
    const result=simulateProjectFees(input);const m=result.amountsUsd;
    assert.equal(result.lifecycleEligibleAfterPolicyApproval,false);
    for(const field of ['closingFee','commercialReserve','commercialQualified','projectCapital','dracmaRetainedBeforeK'])assert.equal(m[field],'0.00');
    assert.equal(m.protectedEscrow,'98500.00');assert.equal(m.grossRefundObligation,'100000.00');assert.equal(m.ownRefundTopUpRequired,'1500.00');
  }
});

test('operating losses require own funding without reducing project or commercial balances',()=>{
  const m=simulateProjectFees({...base,operatingBudgetUsd:'10000.00'}).amountsUsd;
  assert.equal(m.dracmaMarginAfterKBeforeTaxes,'-4878.00');assert.equal(m.ownOperatingFundingRequired,'4878.00');
  assert.equal(m.projectCapital,'90620.00');assert.equal(m.commercialReserve,'2758.00');
});

test('cent rounding conserves cash and never allocates more than the commercial reserve',()=>{
  for(let value=0;value<2000;value++){
    const input={...base,grossUsd:`${Math.floor(value/100)}.${String(value%100).padStart(2,'0')}`,actualProcessorCostUsd:'0.00',operatingBudgetUsd:'0.00'};
    const m=simulateProjectFees(input).amountsUsd;
    assert.equal(cents(m.grossReceipts),cents(m.processorCost)+cents(m.projectCapital)+cents(m.protectedEscrow)+cents(m.commercialReserve)+cents(m.dracmaRetainedBeforeK));
    assert.ok(cents(m.commercialQualified)<=cents(m.commercialReserve));
  }
});

test('rejects ambiguous money, unfunded shares and active-policy usage',()=>{
  for(const value of ['-1','1e4','NaN','1.001','1,50'])assert.throws(()=>simulateProjectFees({...base,grossUsd:value}));
  assert.throws(()=>simulateProjectFees({...base,actualProcessorCostUsd:'100001.00'}));
  assert.throws(()=>simulateProjectFees({...base,campaignQualified:'false'}));
  const policy=structuredClone(proposedPolicy);policy.closing.commercial.directSaleShareBps=10000;
  assert.throws(()=>simulateProjectFees(base,policy));
  assert.throws(()=>simulateProjectFees(base,{...proposedPolicy,status:'active',activated:true}));
});
