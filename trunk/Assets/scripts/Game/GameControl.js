#pragma strict

var roundDuration : float;
var roundTimeRemaining : float;
var roundInProgress : boolean;
var score : int;
var netView : NetworkView;

private var roundStartTime : float;
private var roundEndTime : float;

function Start ()
{
   roundInProgress = false;
}

function Update ()
{
   if (roundInProgress)
   {
      roundTimeRemaining = roundEndTime-Time.time;

      // Round over!
      if (Time.time >= roundEndTime)
      {
         EndRound();
      }
   }
}

function StartRound()
{
   // FIXME: Signal client

   if (!roundInProgress)
   {
      roundInProgress = true;
      roundStartTime = Time.time;
      roundEndTime = Time.time + roundDuration;
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