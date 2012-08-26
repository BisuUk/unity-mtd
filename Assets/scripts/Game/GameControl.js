#pragma strict

var numRounds  : int;
var maxPlayers : int = 2;
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

            if (Game.hostType==0 && Game.player.isAttacker)
               CreditInfusion(newInfusionSize);
            else
            {
               for (var pd : PlayerData in players.Values)
               {
                  if (pd.isAttacker)
                  {
                     pd.credits += newInfusionSize;
                     if (pd.credits > pd.creditCapacity)
                        pd.credits = pd.creditCapacity;
                     netView.RPC("CreditInfusion", pd.netPlayer, newInfusionSize);
                  }
               }
            }
            nextAttackInfusionTime = Time.time + Game.map.attackCreditInfusionFreq;
         }
   
         if (Time.time >= nextDefendInfusionTime)
         {
            newInfusionSize = Mathf.Lerp(
               Game.map.defendCreditInfusionStartSize,
               Game.map.defendCreditInfusionEndSize,
               Mathf.InverseLerp(roundDuration, 0, roundTimeRemaining));

            if (Game.hostType==0 && !Game.player.isAttacker)
               CreditInfusion(newInfusionSize);
            else
            {
               for (var pd : PlayerData in players.Values)
               {
                  if (!pd.isAttacker)
                  {
                     pd.credits += newInfusionSize;
                     //if (pd.credits > pd.creditCapacity)
                     //   pd.credits = pd.creditCapacity;
                     netView.RPC("CreditInfusion", pd.netPlayer, newInfusionSize);
                  }
               }
            }
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
      Debug.Log("Player connected from " + player.ipAddress + ":" + player.port);
   }
}

function OnConnectedToServer()
{
   Debug.Log("OnConnectedToServer");
   //GUIControl.SwitchGUI(101);
   GUIControl2.SwitchGUI(2);
   netView.RPC("ToServerHandshake", RPCMode.Server, Game.player.nameID);
}

function OnPlayerDisconnected(player : NetworkPlayer)
{
   if (Network.isServer)
   {
      players.Remove(player);

      if (GUIControl2.self)
         GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

      netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
      for (var pd : PlayerData in players.Values)
         netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
      netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);

      Debug.Log("Clean up after player " +  player);
      Network.RemoveRPCs(player);
      Network.DestroyPlayerObjects(player);
      Debug.Log("Local server connection disconnected");
   }
}

function OnDisconnectedFromServer(info : NetworkDisconnection)
{
   if (Network.isServer)
   {
      Debug.Log("Local server connection disconnected");
   }
   else
   {
      if (info == NetworkDisconnection.LostConnection)
         Debug.Log("Lost connection to the server");
      else
         Debug.Log("Successfully diconnected from the server");

      GUIControl.SwitchGUI(-1);
      Application.LoadLevel("mainmenu");
   }
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

function SendChat(msg : String)
{
   netView.RPC("ToServerChat", RPCMode.Server, msg);
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

   //GUIControl2.SwitchGUI(-1);
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

   GUIControl2.SwitchGUI(-1);
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
function CreditInfusion(infusion : int)
{
   Game.player.credits += infusion;
   if (Game.player.credits > Game.player.creditCapacity)
      Game.player.credits = Game.player.creditCapacity;
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

@RPC
function CreateTower(towerType : int, pos : Vector3, rot : Quaternion,
                     range : float, fov : float, rate : float, strength : float, effect : int,
                     colorRed : float, colorGreen : float, colorBlue : float, newBehaviour : int,
                     newFoFPosition : Vector3)
{
   var prefabName : String = TowerUtil.PrefabName(towerType);
   var newTower : GameObject;

   if (Game.hostType > 0)
      newTower = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   else
      newTower = Instantiate(Resources.Load(prefabName, GameObject), pos, rot);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(range, fov, rate, strength, effect, Color(colorRed, colorGreen, colorBlue), newBehaviour, newFoFPosition);
}


//-----------------------------------------------------------------------------
// CLIENT TO SERVER RPCs
//-----------------------------------------------------------------------------
@RPC
function ToServerChat(msg : String, info : NetworkMessageInfo)
{
   var newMsg : String = players[info.sender].nameID+": "+msg;
   netView.RPC("ToClientChat", RPCMode.All, newMsg);
}

@RPC
function ToServerRequestPlayerList(info : NetworkMessageInfo)
{
   netView.RPC("ToClientNewPlayerStatusList", info.sender);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", info.sender, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerHandshake(playerName : String, info : NetworkMessageInfo)
{
   var playerData : PlayerData = new PlayerData();
   playerData.nameID = playerName;
   playerData.teamID = 1;
   playerData.netPlayer = info.sender;
   players[info.sender] = playerData;

   if (GUIControl2.self)
      GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerChangeTeam(teamID : int, info : NetworkMessageInfo)
{
   players[info.sender].teamID = teamID;

   if (GUIControl2.self)
      GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerReady(isReady : boolean, info : NetworkMessageInfo)
{
   players[info.sender].isReady = isReady;

   if (GUIControl2.self)
      GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerReadyToStartRound(info : NetworkMessageInfo)
{
   players[info.sender].isReadyToStartRound = true;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
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
function ToClientEndPlayerStatusList()
{
   if (GUIControl2.self)
      GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();
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

   GUIControl2.SwitchGUI(-1);
   GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : GUIControl.defendGUI.guiID);

   // Move camera into place
   Camera.main.GetComponent(CameraControl).snapToDefaultView(Game.player.isAttacker);
}

@RPC
function ToClientChat(msg : String)
{
   if (GUIControl2.self)
      GUIControl2.self.UI[2].GetComponent(MultiplayerLobbyUI).OnChat(msg);
}
