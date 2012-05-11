#pragma strict

var attackStartCredits : int;
var attackCreditInfusionSize: int;
var attackCreditInfusionFreq: float;
var defendStartCredits : int;
var defendCreditInfusionSize: int;
var defendCreditInfusionFreq: float;
var netView : NetworkView;

private var nextAttackInfusionTime : float;
private var nextDefendInfusionTime : float;

@RPC
function CreditInfusion(isAttacker : boolean, infusion : int)
{
   if (Game.player.isAttacker == isAttacker)
      Game.player.credits += infusion;
}

function Update()
{
   if (Network.isServer)
   {
      if(Time.time >= nextAttackInfusionTime)
      {
         netView.RPC("CreditInfusion", RPCMode.All, true, attackCreditInfusionSize);
         nextAttackInfusionTime = Time.time + attackCreditInfusionFreq;
      }

      if(Time.time >= nextDefendInfusionTime)
      {
         netView.RPC("CreditInfusion", RPCMode.All, false, defendCreditInfusionSize);
         nextDefendInfusionTime = Time.time + defendCreditInfusionFreq;
      }
   }
}