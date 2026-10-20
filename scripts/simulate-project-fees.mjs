// Proposal calculator only. No payment, wallet, ledger or deployment integration.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const proposedPolicy=JSON.parse(fs.readFileSync(new URL('../docs/proposals/project-fees.v1.json',import.meta.url),'utf8'));
const usd=value=>{
  if(typeof value!=='string'||!/^(0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(value))throw new Error('Use a nonnegative USD decimal with at most two decimal places.');
  const [whole,fraction='']=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
};
const money=cents=>`${cents<0n?'-':''}${(cents<0n?-cents:cents)/100n}.${((cents<0n?-cents:cents)%100n).toString().padStart(2,'0')}`;
const rate=bps=>{if(!Number.isInteger(bps)||bps<0||bps>10000)throw new Error('Invalid basis points.');return BigInt(bps);};
const halfUp=(base,bps)=>(base*rate(bps)+5000n)/10000n;
const down=(base,bps)=>base*rate(bps)/10000n;

export function simulateProjectFees(input,policy=proposedPolicy){
  if(policy.status!=='draft'||policy.activated!==false)throw new Error('This calculator accepts draft policies only.');
  const closing=policy.closing;const commercial=closing.commercial;
  const shares=[commercial.directSaleShareBps,commercial.campaignBonusShareBps,commercial.volumeBonusShareBps];
  shares.forEach(rate);rate(closing.feeBps);rate(closing.commercialBudgetShareBps);
  if(shares.reduce((sum,bps)=>sum+bps,0)>closing.commercialBudgetShareBps)throw new Error('Commercial shares exceed their funded budget.');
  if(!['open','closed','cancelled'].includes(input.roundState))throw new Error('Invalid round state.');
  for(const flag of ['coolingComplete','attributedSale','campaignQualified','volumeQualified'])if(typeof input[flag]!=='boolean')throw new Error('Explicit scenario qualification flags required.');
  const gross=usd(input.grossUsd);const processor=usd(input.actualProcessorCostUsd);const operating=usd(input.operatingBudgetUsd);
  if(processor>gross)throw new Error('Processor cost exceeds gross receipts.');
  const net=gross-processor;
  const lifecycleEligible=input.roundState==='closed'&&input.coolingComplete;
  const closingFee=lifecycleEligible?halfUp(net,closing.feeBps):0n;
  const commercialReserve=halfUp(closingFee,closing.commercialBudgetShareBps);
  const direct=input.attributedSale?down(closingFee,commercial.directSaleShareBps):0n;
  const campaign=input.attributedSale&&input.campaignQualified?down(closingFee,commercial.campaignBonusShareBps):0n;
  const volume=input.attributedSale&&input.volumeQualified?down(closingFee,commercial.volumeBonusShareBps):0n;
  const commercialQualified=direct+campaign+volume;
  const unassignedReserve=commercialReserve-commercialQualified;
  const retained=closingFee-commercialReserve;
  const projectCapital=lifecycleEligible?net-closingFee:0n;
  const protectedEscrow=lifecycleEligible?0n:net;
  const margin=retained-operating;
  if(gross!==processor+projectCapital+protectedEscrow+commercialReserve+retained||unassignedReserve<0n)throw new Error('Cash conservation invariant failed.');
  return {
    policyVersion:policy.version,
    status:'proposal_only',
    scenario:input,
    lifecycleEligibleAfterPolicyApproval:lifecycleEligible,
    actualPaymentInstructionsGenerated:false,
    qualifiedBonusesAssumed:input.campaignQualified||input.volumeQualified,
    amountsUsd:Object.fromEntries(Object.entries({
      grossReceipts:gross,processorCost:processor,netReceived:net,
      closingFee,projectCapital,protectedEscrow,commercialReserve,
      directSale:direct,campaignBonus:campaign,volumeBonus:volume,
      commercialQualified,commercialUnassignedReserve:unassignedReserve,
      dracmaRetainedBeforeK:retained,operatingBudget:operating,
      dracmaMarginAfterKBeforeTaxes:margin,
      ownOperatingFundingRequired:margin<0n?-margin:0n,
      grossRefundObligation:lifecycleEligible?0n:gross,
      ownRefundTopUpRequired:lifecycleEligible?0n:processor
    }).map(([key,value])=>[key,money(value)])),
    excludes:['setup_quote','annual_administration','secondary_trades','performance_fee','taxes'],
    note:'Qualification flags are hypothetical. Actual campaign and volume thresholds remain undefined; no entitlements or transfers are created.'
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const base={grossUsd:'100000.00',actualProcessorCostUsd:'1500.00',operatingBudgetUsd:'1500.00',roundState:'closed',coolingComplete:true,attributedSale:true,campaignQualified:false,volumeQualified:false};
  const scenarios={
    directOnly:simulateProjectFees(base),
    maximumCommercialBudget:simulateProjectFees({...base,campaignQualified:true,volumeQualified:true}),
    beforeCooling:simulateProjectFees({...base,coolingComplete:false}),
    cancelled:simulateProjectFees({...base,roundState:'cancelled'})
  };
  console.log(JSON.stringify(scenarios,null,2));
}
