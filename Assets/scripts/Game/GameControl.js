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

         var newInfusionSize : int;
         if (Time.time >= nextAttackInfusionTime)
         {
            newInfusionSize = Mathf.Lerp(
               Game.map.attackCreditInfusionStartSize,
               Game.map.attackCreditInfusionEndSize,
               Mathf.InverseLerp(roundDuration, 0, roundTimeRemaining));

            if (Game.hostType==0)
               CreditInfusion(true, newInfusionSize);
            else
               netView.RPC("CreditInfusion", RPCMode.All, true, newInfusionSize);
            nextAttackInfusionTime = Time.time + Game.map.attackCreditInfusionFreq;
         }
   
         if (Time.time >= nextDefendInfusionTime)
         {
            newInfusionSize = Mathf.Lerp(
               Game.map.defendCreditInfusionStartSize,
               Game.map.defendCreditInfusionEndSize,
               Mathf.InverseLerp(roundDuration, 0, roundTimeRemaining));

            if (Game.hostType==0)
               CreditInfusion(false, newInfusionSize);
            else
               netView.RPC("CreditInfusion", RPCMode.All, false, newInfusionSize);
            nextDefendInfusionTime = Time.time + Game.map.defendCreditInfusionFreq;
         }
      }
   }
   else if (waitingForClientsToStart)
   {
      var allAreReadyToStart : boolean = true;
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReadyToStartRound)
            allAreReadyToStart = false;
      }

      if (allAreReadyToStart)
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
   if (Application.loadedLevelName == "mainmenu")
      return;

   Game.player.isReadyToStartRound = true;

   if (Network.isClient)
      netView.RPC("ToServerReadyToStartRound", RPCMode.Server);
}

function NewNetworkGame()
{
   players = new Dictionary.<NetworkPlayer, PlayerData>();
   Game.player.teamID = 1;
   players[Network.player] = Game.player;
}

function InitRound()
{
   var loadLevel : boolean = true;
   // Set all player flag to note they have not loaded the level yet.
   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReady)
            loadLevel = false;

         if (pd.netPlayer != Network.player)
         {
            pd.isAttacker = (pd.teamID == 1);
            pd.isReadyToStartRound = false;
            netView.RPC("ToClientInitRound", pd.netPlayer,
               nextLevel,
               pd.isAttacker,
               1000,2000, // FIXME-If we don't load the map first we don't have this info
               //(pd.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits,
               //Game.map.attackStartCreditCapacity,
               roundDuration);
         }
      }

   }

   // Clients include self, so this works for singleplayer
   waitingForClientsToStart = true;

   // Load the new level
   if (loadLevel)
      Application.LoadLevel(nextLevel);
}

function StartRound()
{
   waitingForClientsToStart = false;

   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;
   roundInProgress = true;

   Game.player.isReadyToStartRound = true;
   Game.player.isAttacker = (Game.player.teamID == 1);
   Game.player.credits = (Game.player.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits;
   //if (Game.player.isAttacker)
      Game.player.creditCapacity = Game.map.attackStartCreditCapacity;

   if (Network.isServer)
      netView.RPC("ToClientStartRound", RPCMode.Others);

   GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : GUIControl.defendGUI.guiID);

   Debug.Log("StartRound");
}

@RPC
function EndRound()
{
   roundInProgress = false;
   roundTimeRemaining = 0.0;

   if (Network.isServer)
      netView.RPC("EndRound", RPCMode.Others);

   Debug.Log("EndRound");
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
   {
      Game.player.credits += infusion;
      if (isAttacker && Game.player.credits > Game.player.creditCapacity)
         Game.player.credits = Game.player.creditCapacity;
   }
}

@RPC
function CreditCapacityChange(isNewValue : boolean, amount : int)
{
   if (Game.player.isAttacker)
   {
      if (isNewValue)
         Game.player.creditCapacity = amount;
      else
         Game.player.creditCapacity += amount;
   }

   if (Network.isServer)
      netView.RPC("CreditCapacityChange", RPCMode.Others, isNewValue, amount);
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
function ToClientInitRound(levelName : String, isAttacker : boolean, startingCredits : int, startingCreditCapacity : int, duration : float)
{
   Debug.Log("ToClientInitRound="+levelName);
   Game.player.isAttacker = isAttacker;
   Game.player.credits = startingCredits;
   if (Game.player.isAttacker)
      Game.player.creditCapacity = startingCreditCapacity;
   roundDuration = duration;
   Application.LoadLevel(levelName);
}

@RPC
function ToClientStartRound()
{
   Debug.Log("ToClientStartRound");
   GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : GUIControl.defendGUI.guiID);
   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;
   roundInProgress = true;
}