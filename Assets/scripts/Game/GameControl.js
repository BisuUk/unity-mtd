#pragma strict

var roundDuration : float;
var roundTimeRemaining : float;
var roundInProgress : boolean;
var score : int;
var nextLevel : String;
var players : Dictionary.<NetworkPlayer, PlayerData>;
var netView : NetworkView;

private var roundStartTime : float;
private var roundEndTime : float;
private var nextAttackInfusionTime : float;
private var nextDefendInfusionTime : float;
private var waitingForClientsToStart : boolean;

function Start()
{
   roundInProgress = false;
   nextLevel = "Scene1";
   players = new Dictionary.<NetworkPlayer, PlayerData>();
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
   else if (waitingForClientsToStart)
   {
      var readyToStart : boolean = true;
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReadyToStartRound)
            readyToStart = false;
      }

      if (readyToStart)
         StartRound();
   }
}

function OnPlayerConnected(player : NetworkPlayer)
{
   // No joins after game going
   if (roundInProgress)
   {
      Network.CloseConnection(player, true);
   }
}

function OnConnectedToServer()
{
   netView.RPC("ToServerHandshake", RPCMode.Server, Game.player.nameID);
}

function OnPlayerDisconnected(player : NetworkPlayer)
{
   players.Remove(player);

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

function OnLevelWasLoaded()
{
   if (Network.isClient)
   {
      Game.player.isReadyToStartRound = true;
      netView.RPC("ToServerReadyToStartRound", RPCMode.Server);
   }
   else
   {
      Game.player.isReadyToStartRound = true;
      Game.player.isAttacker = (Game.player.teamID == 1);
      Game.player.credits = (Game.player.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits;

      if (Network.isServer)
      {
         for (var pd : PlayerData in players.Values)
         {
            if (pd.netPlayer != Network.player)
            {
               pd.isAttacker = (pd.teamID == 1);
               pd.isReadyToStartRound = false;
               netView.RPC("ToClientInitRound", pd.netPlayer,
                  nextLevel,
                  pd.isAttacker,
                  (pd.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits,
                  roundDuration);
            }
         }
         waitingForClientsToStart = true;
      }
      else
      {
         StartRound();
      }
   }
}

function NewGame()
{
   players = new Dictionary.<NetworkPlayer, PlayerData>();
   Game.player.teamID = 1;
   players[Network.player] = Game.player;
}

function InitRound()
{
   var loadLevel : boolean = true;
   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReady)
            loadLevel = false;
      }
   }

   if (loadLevel)
      Application.LoadLevel(nextLevel);
}

function StartRound()
{
   waitingForClientsToStart = false;

   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;
   roundInProgress = true;

   GUIControl.SwitchGUI((Game.player.isAttacker)?2:3);

   if (Network.isServer)
      netView.RPC("ToClientStartRound", RPCMode.Others);
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

//-----------------------------------------------------------------------------
// CLIENT TO SERVER RPCs
//-----------------------------------------------------------------------------

@RPC
function ToServerHandshake(playerName : String, info : NetworkMessageInfo)
{
   var playerData : PlayerData = new PlayerData();
   playerData.nameID = playerName;
   playerData.teamID = 1;
   playerData.netPlayer = info.sender;
   players[info.sender] = playerData;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

@RPC
function ToServerChangeTeam(teamID : int, info : NetworkMessageInfo)
{
   players[info.sender].teamID = teamID;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

@RPC
function ToServerReady(isReady : boolean, info : NetworkMessageInfo)
{
   players[info.sender].isReady = isReady;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

@RPC
function ToServerReadyToStartRound(info : NetworkMessageInfo)
{
   players[info.sender].isReadyToStartRound = true;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

//-----------------------------------------------------------------------------
// SERVER TO CLEINT RPCs
//-----------------------------------------------------------------------------

@RPC
function ToClientNewPlayerStatusList()
{
   players.Clear();
}

@RPC
function ToClientNewPlayerStatus(netPlayer : NetworkPlayer, nameID : String, teamID : int, isReady : boolean)
{
   var playerData : PlayerData = new PlayerData();
   playerData.netPlayer = netPlayer;
   playerData.nameID = nameID;
   playerData.teamID = teamID;
   playerData.isReady = isReady;
   players[netPlayer] = playerData;
}


@RPC
function ToClientInitRound(levelName : String, isAttacker : boolean, startingCredits : int, duration : float)
{
   Debug.Log("ToClientInitRound="+levelName);
   Game.player.isAttacker = isAttacker;
   Game.player.credits = startingCredits;
   roundDuration = duration;
   Application.LoadLevel(levelName);
}

@RPC
function ToClientStartRound()
{
   GUIControl.SwitchGUI((Game.player.isAttacker)?2:3);
   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;
   roundInProgress = true;
}
