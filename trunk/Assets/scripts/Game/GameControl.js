#pragma strict

var roundDuration : float;
var roundTimeRemaining : float;
var roundInProgress : boolean;
var score : int;
var netView : NetworkView;

private var roundStartTime : float;
private var roundEndTime : float;
private var nextAttackInfusionTime : float;
private var nextDefendInfusionTime : float;

function Start ()
{
   roundInProgress = false;
}

function Update()
{
   if (Application.isLoadingLevel)
      return;

   if (roundInProgress)
   {
      roundTimeRemaining = roundEndTime-Time.time;

      if (Network.isServer || Game.hostType==0)
      {
         // Round over!
         if (Time.time >= roundEndTime)
            EndRound();

         if (Time.time >= nextAttackInfusionTime)
         {
            if (Game.hostType==0)
               CreditInfusion(true, Game.map.attackCreditInfusionSize);
            else
               netView.RPC("CreditInfusion", RPCMode.All, true, Game.map.attackCreditInfusionSize);
            nextAttackInfusionTime = Time.time + Game.map.attackCreditInfusionFreq;
         }
   
         if (Time.time >= nextDefendInfusionTime)
         {
            if (Game.hostType==0)
               CreditInfusion(false, Game.map.defendCreditInfusionSize);
            else
               netView.RPC("CreditInfusion", RPCMode.All, false, Game.map.defendCreditInfusionSize);
            nextDefendInfusionTime = Time.time + Game.map.defendCreditInfusionFreq;
         }
      }
   }
}

@RPC
function StartRound()
{
   if (!roundInProgress)
   {
      roundInProgress = true;
      roundStartTime = Time.time;
      roundEndTime = Time.time + roundDuration;
      if (Network.isServer)
         netView.RPC("StartRound", RPCMode.Others);
   }
}

@RPC
function Score(amount : int)
{
   if (Network.isClient)
      score += amount;
   else if (roundInProgress)
   {
      score += amount;
      if (Network.isServer)
         netView.RPC("Score", RPCMode.Others, amount);
   }
}

@RPC
function EndRound()
{
   roundInProgress = false;
   roundTimeRemaining = 0.0;

   if (Network.isServer)
      netView.RPC("EndRound", RPCMode.Others);
}

function OnPlayerConnected(player : NetworkPlayer)
{
   if (!roundInProgress)
   {
      GUIControl.SwitchGUI(2);
      if (Application.loadedLevel==0)
      {
         Application.LoadLevel("Scene1"); // FIXME: Load a player selected level
         netView.RPC("InitClient", player, "Scene1", true);
      }
   }

}

@RPC
function ClientReady()
{
   StartRound(); // FIXME: create READY UI
   Game.player.isAttacker = false;
   GUIControl.SwitchGUI((Game.player.isAttacker)?2:3);
}

@RPC
function InitClient(levelName : String, isAttacker : boolean)
{
   Application.LoadLevel(levelName);
   Game.player.isAttacker = isAttacker;
   GUIControl.SwitchGUI((isAttacker)?2:3);
   netView.RPC("ClientReady", RPCMode.Server);
}

@RPC
function CreditInfusion(isAttacker : boolean, infusion : int)
{
   if (Game.player.isAttacker == isAttacker)
      Game.player.credits += infusion;
}
