#pragma strict

var roundDuration : float;
var roundTimeRemaining : float;
var roundInProgress : boolean;
var score : int;
var nextLevel : String;
var players : Dictionary.<String, PlayerData>;
var netView : NetworkView;

private var roundStartTime : float;
private var roundEndTime : float;
private var nextAttackInfusionTime : float;
private var nextDefendInfusionTime : float;

function Start()
{
   roundInProgress = false;
   nextLevel = "Scene1";
}

function NewGame()
{
   players = new Dictionary.<String, PlayerData>();
   players[Game.player.nameID] = Game.player;
}

function OnLevelWasLoaded()
{
   if (Game.hostType==0)
      StartRound();
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

function OnPlayerConnected(player : NetworkPlayer)
{
   if (roundInProgress)
   {
      // No joins after game going
      Network.CloseConnection(player, true);
/*
      GUIControl.SwitchGUI(2);
      if (Application.loadedLevel==0)
      {
         Application.LoadLevel(nextLevel); // FIXME: Load a player selected level


         //netView.RPC("InitClient", player, nextLevel, true, Game.map.attackStartCredits);
      }
*/
   }
}

function OnConnectedToServer()
{
   netView.RPC("ToServerHandshake", RPCMode.Server, Game.player.nameID);

   // Notify our objects that the level and the network are ready
   //for (var go : GameObject in FindObjectsOfType(GameObject))
      //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
}

@RPC
function ToServerHandshake(playerName : String, info : NetworkMessageInfo)
{
   var playerData : PlayerData = new PlayerData();
   playerData.nameID = playerName;
   playerData.teamID = 1;
   playerData.netPlayer = info.sender;
   players[playerName] = playerData;

   var statusStr : String;

   for (var pd : PlayerData in players.Values)
   {
      statusStr += pd.nameID;
      statusStr += ",";
      statusStr += pd.teamID;
      statusStr += ",";
      statusStr += (pd.isReady?"1":"0");
      statusStr += ";";
   }

   netView.RPC("ToClientPlayerStatus", RPCMode.Others, statusStr);
}

@RPC
function ToServerChangeTeam(playerName : String, teamID : int)
{

}

@RPC
function ToServerReady(playerName : String, isReady : boolean)
{
   Debug.Log("Player="+playerName+" isReady="+isReady);
   players[playerName].isReady = isReady;
}

@RPC
function ToClientPlayerStatus(statusStr : String)
{
   players.Clear();
   var playerData : PlayerData;
   var playerStrings : String[] = statusStr.Split(";"[0]);

   for (var playerString : String in playerStrings)
   {
      playerData = new PlayerData();
      var statusStrings : String[] = playerString.Split(","[0]);

      playerData.nameID = statusStrings[0];
      playerData.teamID = int.Parse(statusStrings[1]);
      playerData.isReady = boolean.Parse(statusStrings[2]);
      players[playerData.nameID] = playerData;
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
      Game.player.credits = (Game.player.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits;
      if (Network.isServer)
         netView.RPC("StartRound", RPCMode.Others);
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

@RPC
function ClientReady()
{
   StartRound(); // FIXME: create READY UI
   Game.player.isAttacker = false;
   GUIControl.SwitchGUI((Game.player.isAttacker)?2:3);
}

@RPC
function InitClient(levelName : String, isAttacker : boolean, startingCredits : int)
{
   Application.LoadLevel(levelName);
   Game.player.isAttacker = isAttacker;
   Game.player.credits = startingCredits;
   GUIControl.SwitchGUI((isAttacker)?2:3);
   netView.RPC("ClientReady", RPCMode.Server);
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
function CreditInfusion(isAttacker : boolean, infusion : int)
{
   if (Game.player.isAttacker == isAttacker)
      Game.player.credits += infusion;
}
