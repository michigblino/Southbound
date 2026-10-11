/* Scenario ranges, not statistical confidence intervals. */
(function(g){'use strict';
const defaults={lodging:20,food:15,leisure:25,other:20,transport:35};
function calculate({fixed=0,exposure={},rates=defaults,goal=0,cap=Infinity}){
 let center=Number(fixed)||0,down=0,up=0;const rows=[];
 for(const key of Object.keys(defaults)){const amount=Math.max(0,Number(exposure[key])||0),rate=Math.min(100,Math.max(0,Number(rates[key]??defaults[key])||0))/100;center+=amount;down+=amount*rate;up+=amount*rate;rows.push({key,amount,rate:rate*100,delta:amount*rate})}
 const low=Math.max(0,center-down),high=center+up;
 return {center,low,high,down,up,rows,goalAtRisk:high>goal,capAtRisk:high>cap,bufferToGoal:goal-high,bufferToCap:cap-high};
}
g.SouthboundUncertainty={calculate,defaults};
})(typeof window!=='undefined'?window:globalThis);
