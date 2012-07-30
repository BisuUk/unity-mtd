#pragma strict

var numRounds  : int;
var currentRound : int;
var counterTurn : boolean;
var roundDuration : float;
var roundTimeRemaining : float;
var allowNewConnections : boolean;
var roundInProgress : boolean;
var matchInProgress : boolean;
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
   matchInProgress = false;
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
   if (!allowNewConnections)
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
   var allAreReady : boolean = true;
   // Set all player flag to note they have not loaded the level yet.
   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
      {
         // Make sure everyone is ready (flagged ready in lobby)
         if (!pd.isReady)
            allAreReady = false;
      }
   }

   // Load the new level
   if (allAreReady)
   {
      waitingForClientsToStart = true;
      allowNewConnections = false;
      matchInProgress = true;
      currentRound = 1;
      counterTurn = false;
      // Clients include self, so this works for singleplayer
      Application.LoadLevel(nextLevel);
      if (Network.isServer)
         netView.RPC("ToClientInitRound", RPCMode.Others, nextLevel);
   }
}

function StartRound()
{
   waitingForClientsToStart = false;

   roundInProgress = true;
   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;

   Game.player.isReadyToStartRound = true;
   Game.player.isAttacker = (Game.player.teamID == 1);
   Game.player.credits = (Game.player.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits;
   //if (Game.player.isAttacker)
      Game.player.creditCapacity = Game.map.attackStartCreditCapacity;

   if (Network.isServer)
   {


      for (var pd : PlayerData in players.Values)
      {
         if (pd.netPlayer != Network.player)
         {
            pd.isAttacker = (pd.teamID == 1);
            pd.isReadyToStartRound = false;
            netView.RPC("ToClientStartRound", pd.netPlayer,
               pd.isAttacker,
               (pd.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits,
               Game.map.attackStartCreditCapacity,
               roundDuration);
         }
      }
   }

   GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : GUIControl.defendGUI.guiID);

   // Move camera into place
   Camera.main.GetComponent(CameraControl).snapToDefaultView(Game.player.isAttacker);

   Debug.Log("StartRound");
}

function ResetRound()
{
   if (counterTurn)
      currentRound += 1;
   counterTurn = !counterTurn;

   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
         pd.teamID = (pd.teamID==2) ? 1 : 2;
   }
   else // single player
   {
      Game.player.teamID = (Game.player.teamID==2) ? 1 : 2;
   }

   waitingForClientsToStart = true;
}

@RPC
function EndRound()
{
   roundInProgress = false;
   roundTimeRemaining = 0.0;
   matchInProgress = true;

   Game.player.ClearSelectedTowers();

   if (!Network.isClient)
   {
      // Destroy all tower game objects
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("TOWER");
      for (var obj : GameObject in objs)
      {
         if (Network.isServer)
            Network.Destroy(obj);
         else
            Destroy(obj);
      }

      // Destroy all unit game objects
      objs = GameObject.FindGameObjectsWithTag("UNIT");
      for (var obj : GameObject in objs)
      {
         if (Network.isServer)
            Network.Destroy(obj);
         else
            Destroy(obj);
      }

      // Reset all ready states for clients
      if (Network.isServer)
      {
         for (var pd : PlayerData in players.Values)
            pd.isReadyToStartRound = false;
      }

      // Check for match over
      if (Game.control.currentRound == Game.control.numRounds && counterTurn)
      {
         EndMatch();
      }
      else
      {
         GUIControl.SwitchGUI(5);
         // TODO:Send round stats to client
         if (Network.isServer)
            netView.RPC("EndRound", RPCMode.Others);
      }
   }
   else // Is a client
   {
      GUIControl.SwitchGUI(5);
   }

   Debug.Log("EndRound");
}

@RPC
function EndMatch()
{
   roundTimeRemaining = 0.0;
   roundInProgress = false;
   matchInProgress = false;

   for (var pd : PlayerData in players.Values)
      pd.isReady = false;

   GUIControl.SwitchGUI(5);

   if (Network.isServer)
      netView.RPC("EndMatch", RPCMode.Others);
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
   //if (Game.player.isAttacker)
   //{
      if (isNewValue)
         Game.player.creditCapacity = amount;
      else
         Game.player.creditCapacity += amount;
   //}

   if (Network.isServer)
      netView.RPC("CreditCapacityChange", RPCMode.Others, isNewValue, amount);
}

//-----------------------------------------------------------------------------
// CLIENT TO SERVER RPCs
//-----------------------------------------------------------------------------

@RPC
function ToServerRequestPlayerList(info : NetworkMessageInfo)
{
   netView.RPC("ToClientNewPlayerStatusList", info.sender);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", info.sender, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
}

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
// SERVER-TO-CLIENT RPCs
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
function ToClientInitRound(levelName : String)
{
   Debug.Log("ToClientInitRound="+levelName);

   Application.LoadLevel(levelName);
}

@RPC
function ToClientStartRound(isAttacker : boolean, startingCredits : int, startingCreditCapacity : int, duration : float)
{
   Debug.Log("ToClientStartRound");
   Game.player.isAttacker = isAttacker;
   Game.player.credits = startingCredits;
   if (Game.player.isAttacker)
      Game.player.creditCapacity = startingCreditCapacity;
   roundDuration = duration;
   roundStartTime = Time.time;
   roundEndTime = Time.time + roundDuration;
   roundInProgress = true;

   GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : GUIControl.defendGUI.guiID);

   // Move camera into place
   Camera.main.GetComponent(CameraControl).snapToDefaultView(Game.player.isAttacker);
}