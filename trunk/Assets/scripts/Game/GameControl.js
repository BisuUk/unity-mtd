#pragma strict

enum GameModeType
{
   GAMEMODE_PUZZLE = 0,
   GAMEMODE_TD
};

var mode : GameModeType;
var numRounds  : int;
var maxPlayers : int = 2;
var duration : float;
var nextLevel : String;
var netView : NetworkView;
var players : Dictionary.<NetworkPlayer, PlayerData>;
var score : int;
var roundInProgress : boolean;
var gameInProgress : boolean;
var allowNewConnections : boolean;
var currentRound : int;
var counterTurn : boolean;
var levelTime : float;
var isGameEnding : boolean;

private var startTime : float;
private var endTime : float;
private var nextAttackInfusionTime : float;
private var nextDefendInfusionTime : float;
private var waitingForClientsToStart : boolean;

function Start()
{
   isGameEnding = false;
   gameInProgress = false;
   roundInProgress = false;
   players = new Dictionary.<NetworkPlayer, PlayerData>();
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
   UIControl.SwitchUI(2);
   netView.RPC("ToServerHandshake", RPCMode.Server, Game.player.nameID);
}

function OnPlayerDisconnected(player : NetworkPlayer)
{
   if (Network.isServer)
   {
      players.Remove(player);

      UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

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

      Application.LoadLevel("mainmenu");
   }
}

function NewNetworkGame()
{
   players = new Dictionary.<NetworkPlayer, PlayerData>();
   Game.player.teamID = 1;
   players[Network.player] = Game.player;
}

function OnLevelWasLoaded()
{
   if (Application.loadedLevelName == "mainmenu")
      return;

   Game.player.isReadyToStart = true;

   if (Network.isClient)
      netView.RPC("ToServerReadyToStartRound", RPCMode.Server);
}

//--------------------------
// PREGAME SETUP
//--------------------------

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

   UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerChangeTeam(teamID : int, info : NetworkMessageInfo)
{
   players[info.sender].teamID = teamID;

   UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerReady(isReady : boolean, info : NetworkMessageInfo)
{
   players[info.sender].isReady = isReady;

   UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

@RPC
function ToServerReadyToStart(info : NetworkMessageInfo)
{
   players[info.sender].isReadyToStart = true;

   netView.RPC("ToClientNewPlayerStatusList", RPCMode.Others);
   for (var pd : PlayerData in players.Values)
      netView.RPC("ToClientNewPlayerStatus", RPCMode.Others, pd.netPlayer, pd.nameID, pd.teamID, pd.isReady);
   netView.RPC("ToClientEndPlayerStatusList", RPCMode.Others);
}

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
   UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnRefreshPlayerData();
}


//--------------------------
// GENERAL/COMMON ALL MODES
//--------------------------


function SendChat(msg : String)
{
   netView.RPC("ToServerChat", RPCMode.Server, msg);
}

@RPC
function ToClientChat(msg : String)
{
   UIControl.GetUI(2).GetComponent(MultiplayerLobbyUI).OnChat(msg);
}

@RPC
function CreateTower(towerType : int, pos : Vector3, rot : Quaternion,
                     pStrength : int, pRate : int, pRange : int,
                     colorRed : float, colorGreen : float, colorBlue : float,
                     newFoFPosition : Vector3,
                     info : NetworkMessageInfo)
{
   var newTower : GameObject;

   // Serverside cost check
   if (Network.isServer)
   {
      //var cost : float = Game.costs.tower[towerType].TotalCostFromPoints(pStrength, pRate, pRange);
      //if (Game.control.CanClientAfford(info.sender, cost))
      //{
         // Deduct cost from player's credits
      //   Game.control.players[info.sender].credits -= cost;
      //}
      //else
      //{
      //   Debug.LogError("Player: "+Game.control.players[info.sender].nameID+" cannot afford this tower. Haxx?");
      //   return;
      //}
   }

   if (Game.hostType > 0)
      newTower = Network.Instantiate(Game.prefab.Tower(towerType), pos, rot, 0);
   else
      newTower = Instantiate(Game.prefab.Tower(towerType), pos, rot);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(pStrength, pRate, pRange, Color(colorRed, colorGreen, colorBlue), newFoFPosition);
}

@RPC
function CastAbility(ID : int, pos : Vector3, r : float, g : float, b : float, info : NetworkMessageInfo)
{
   // Serverside cost check
   if (Network.isServer)
   {
      //var cost : int =  Game.costs.Ability(ID);
      //if (Game.control.CanClientAfford(info.sender, cost))
      //{
         // Deduct cost from player's credits
      //   Game.control.players[info.sender].credits -= cost;
      //}
      //else
      //{
      //   Debug.LogError("Player: "+Game.control.players[info.sender].nameID+" cannot afford this ability. Haxx?");
      //   return;
      //}
   }

   var abilityObject : GameObject;

   if (Network.isServer)
      abilityObject = Network.Instantiate(Game.prefab.Ability(ID), pos, Quaternion.identity, 0);
   else
      abilityObject = Instantiate(Game.prefab.Ability(ID), pos, Quaternion.identity);

   OnUseAbility();

   abilityObject.name = "AbilityObject";
   abilityObject.SendMessage("MakeCursor", false);

   var base : AbilityBase = abilityObject.GetComponent(AbilityBase);
   if (Network.isServer)
   {
      base.netView.RPC("SetColor", RPCMode.Others, r,g,b);
      base.netView.RPC("TriggerEffect", RPCMode.Others);
   }
   base.SetColor(r,g,b);
   base.TriggerEffect();
}

@RPC
function SpeedChange(speed : float)
{
   if (speed <= 8.0 && speed >= 0.25)
   {
      Time.timeScale = speed;
      //Time.fixedDeltaTime = speed; // fucks up tweens

      if (!Network.isClient)
      {
         UIControl.OnScreenMessage(("Changing speed to x"+speed), Color.yellow, 1.5);
         if (Network.isServer)
            netView.RPC("SpeedChange", RPCMode.Others, speed);
      }
      else
      {
         UIControl.OnScreenMessage(("Server changed speed to x"+speed), Color.yellow, 1.5);
      }
   }
}

function Update()
{
   if (Application.isLoadingLevel)
      return;

   switch (mode)
   {
      case GameModeType.GAMEMODE_PUZZLE:
         UpdateModePuzzle();
         break;

      case GameModeType.GAMEMODE_TD:
         UpdateModeTD();
         break;
   }
}

function InitLevel(newMode : int, newLevel : String)
{
   Debug.Log("InitLevel:mode="+mode+" level="+newLevel);
   mode = newMode;
   nextLevel = newLevel;

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
      Debug.Log("InitLevel:allAreReady="+allAreReady);
      waitingForClientsToStart = true;
      allowNewConnections = false;
      gameInProgress = true;
      // Clients include self, so this works for singleplayer
      Application.LoadLevel(nextLevel);
      if (Network.isServer)
         netView.RPC("ToClientInitLevel", RPCMode.Others, nextLevel);
   }
}

@RPC
function ToClientInitLevel(levelName : String)
{
   Debug.Log("ToClientInitLevel="+levelName);
   Application.LoadLevel(levelName);
}

function OnUnitDeath()
{
   numUnitDeaths += 1;
   Debug.Log("GC::OnUnitDeath n="+numUnitDeaths);
}

function OnUnitSpawn()
{
   numUnitsUsed += 1;
   Debug.Log("GC::OnUnitSpawn n="+numUnitsUsed);
}

function OnUseAbility()
{
   numAbilitiesUsed += 1;
   Debug.Log("GC::OnUseAbility n="+numAbilitiesUsed);
}


//--------------------------
// PUZZLE MODE
//--------------------------

var goals : List.<GoalStation>;
var numAbilitiesUsed : int;
var numUnitsUsed : int;
var numUnitDeaths : int;

function StartPuzzleLevel()
{
   Debug.Log("StartPuzzleLevel");

   ResetScores();
   waitingForClientsToStart = false;
   startTime = Time.time;
   Game.player.isReadyToStart = true;
   isGameEnding = false;
   goals = new List.<GoalStation>();

   var goalIndexCounter : int = 0;
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("ENDGOAL");
   for (var go : GameObject in objs)
   {
      var goal : GoalStation = go.GetComponent(GoalStation);
      if (goal)
      {
         goal.assignedIndex = goalIndexCounter;
         goals.Add(goal);
         goalIndexCounter += 1;
      }
   }
   Debug.Log("Goals found: "+goals.Count);

   // Tell all clients to start
   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
      {
         if (pd.netPlayer != Network.player)
         {
            pd.isReadyToStart = false;
            netView.RPC("ToClientStartPuzzleLevel", pd.netPlayer);
         }
      }
   }

   // Switch to puzzle UI
   UIControl.SwitchUI(PuzzleUI.uiIndex);

   UIControl.CurrentUI().SendMessage("OnSetGoalIcons", SendMessageOptions.DontRequireReceiver);

   // Move camera into place
   Camera.main.GetComponent(CameraControl2).SnapToDefaultView(true);
}

@RPC
function ToClientStartPuzzleLevel()
{
   Debug.Log("ToClientStartPuzzleLevel");
   startTime = Time.time;

   UIControl.SwitchUI(PuzzleUI.uiIndex);

   // Move camera into place
   Camera.main.GetComponent(CameraControl2).SnapToDefaultView(true);
}

function ResetScores()
{
   numAbilitiesUsed = 0;
   numUnitsUsed = 0;
   numUnitDeaths = 0;
}

function UpdateModePuzzle()
{
   if (waitingForClientsToStart)
   {
      var allAreReadyToStart : boolean = true;
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReadyToStart)
            allAreReadyToStart = false;
      }

      // Everyone has the level load, start the game
      if (allAreReadyToStart)
         StartPuzzleLevel();
   }
   else if (gameInProgress)
   {
      levelTime = Time.time-startTime;
      if (isGameEnding)
         EndPuzzleLevel();
   }
}

@RPC
function EndPuzzleLevel()
{
   Debug.Log("EndPuzzleLevel");

   // Destroy all unit game objects
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
   for (var obj : GameObject in objs)
   {
      if (Network.isServer)
         Network.Destroy(obj);
      else
         Destroy(obj);
   }
   SpeedChange(1.0);
   isGameEnding = false;

   // TODO:Send round stats to client
//   if (Network.isServer)
//      netView.RPC("ToClientEndPuzzleLevel", RPCMode.Others, stars, time, units, died, etc));

   UIControl.SwitchUI(EndLevelUI.uiIndex);
}

function UnitReachedGoal(goal : GoalStation)
{
   UIControl.CurrentUI().SendMessage("OnUnitReachedGoal", goals[goal.assignedIndex], SendMessageOptions.DontRequireReceiver);
   CheckLevelComplete();
}

function CheckLevelComplete()
{
   for (var gs : GoalStation in goals)
   {
      if (!gs.isFull)
         return;
   }

   isGameEnding = true;
}

/*
@RPC
function ToClientEndPuzzleLevel(stars, time, units, died, etc)
{
}
*/


//--------------------------
// TOWER DEFENSE MODE
//--------------------------


function StartTDRound()
{
   waitingForClientsToStart = false;

   roundInProgress = true;
   startTime = Time.time;
   endTime = Time.time + duration;

   Game.player.isReadyToStart = true;
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
            pd.isReadyToStart = false;
            pd.credits = (pd.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits;
            pd.creditCapacity = (pd.isAttacker) ? Game.map.attackStartCreditCapacity : 0;

            netView.RPC("ToClientStartTDRound", pd.netPlayer,
               pd.isAttacker,
               (pd.isAttacker) ? Game.map.attackStartCredits : Game.map.defendStartCredits,
               Game.map.attackStartCreditCapacity,
               duration);
         }
      }
   }

   UIControl.SwitchUI((Game.player.isAttacker) ? 1 : 0);

   // Move camera into place
   Camera.main.GetComponent(CameraControl2).SnapToDefaultView(Game.player.isAttacker);

   Debug.Log("StartTDRound");
}

@RPC
function ToClientStartTDRound(pIsAttacker : boolean, pStartingCredits : int, pStartingCreditCapacity : int, pDuration : float)
{
   Debug.Log("ToClientStartTDRound");
   Game.player.isAttacker = pIsAttacker;
   Game.player.credits = pStartingCredits;
   if (Game.player.isAttacker)
      Game.player.creditCapacity = pStartingCreditCapacity;
   duration = pDuration;
   startTime = Time.time;
   endTime = Time.time + duration;
   gameInProgress = true;

   UIControl.SwitchUI((Game.player.isAttacker) ? 1 : 0);

   // Move camera into place
   Camera.main.GetComponent(CameraControl2).SnapToDefaultView(Game.player.isAttacker);
}

function UpdateModeTD()
{
   if (roundInProgress)
   {
      levelTime = (duration <= 0) ? (Time.time-startTime) : (endTime-Time.time);

      if (!Network.isClient)
      {
         // Round over!
         if (duration > 0 && Time.time >= endTime)
            EndTDRound();

         if (Game.map.useCreditInfusions)
         {
            var newInfusionSize : int;
            if (Time.time >= nextAttackInfusionTime)
            {
               newInfusionSize = Mathf.Lerp(
                  Game.map.attackCreditInfusionStartSize,
                  Game.map.attackCreditInfusionEndSize,
                  Mathf.InverseLerp(duration, 0, levelTime));
   
               if (!Network.isServer && Game.player.isAttacker)
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
                        if (pd.netPlayer != Network.player)
                           netView.RPC("CreditsUpdate", pd.netPlayer, pd.credits);
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
                  Mathf.InverseLerp(duration, 0, levelTime));
   
               if (!Network.isServer && !Game.player.isAttacker)
                  CreditInfusion(newInfusionSize);
               else
               {
                  for (var pd : PlayerData in players.Values)
                  {
                     if (!pd.isAttacker)
                     {
                        pd.credits += newInfusionSize;
                        if (pd.netPlayer != Network.player)
                           netView.RPC("CreditsUpdate", pd.netPlayer, pd.credits);
                     }
                  }
               }
               nextDefendInfusionTime = Time.time + Game.map.defendCreditInfusionFreq;
            }
         }
      }
   }
   else if (waitingForClientsToStart)
   {
      var allAreReadyToStart : boolean = true;
      for (var pd : PlayerData in players.Values)
      {
         if (!pd.isReadyToStart)
            allAreReadyToStart = false;
      }

      if (allAreReadyToStart)
         StartTDRound();
   }
}

@RPC
function EndTDRound()
{
   roundInProgress = false;
   levelTime = 0.0;
   gameInProgress = true;

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
            pd.isReadyToStart = false;
      }

      // Check for match over
      if (Game.control.currentRound == Game.control.numRounds && counterTurn)
      {
         EndTDMatch();
      }
      else
      {
         //GUIControl.SwitchGUI(5);
         // TODO:Send round stats to client
         if (Network.isServer)
            netView.RPC("EndTDMatch", RPCMode.Others);
      }
   }
   else // Is a client
   {
      //GUIControl.SwitchGUI(5);
   }

   Debug.Log("EndRound");
}

function ResetTDRound()
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
function EndTDMatch()
{
   levelTime = 0.0;
   roundInProgress = false;
   gameInProgress = false;

   for (var pd : PlayerData in players.Values)
      pd.isReady = false;

   UIControl.SwitchUI(-1);

   if (Network.isServer)
      netView.RPC("EndMatch", RPCMode.Others);
}


@RPC
function ScoreTD(amount : int)
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
function CreditsUpdate(credits : int)
{
   Game.player.credits = credits;
}

@RPC
function CreditInfusion(infusion : int)
{
   Game.player.credits += infusion;
   if (Game.map.useCreditCapacities && Game.player.isAttacker) // Just cap attacker
      if (Game.player.credits > Game.player.creditCapacity)
         Game.player.credits = Game.player.creditCapacity;
}

@RPC
function CreditCapacityChange(forAttackers : boolean, isNewValue : boolean, amount : int)
{
   if (forAttackers && Game.player.isAttacker)
   //{
      if (isNewValue)
         Game.player.creditCapacity = amount;
      else
         Game.player.creditCapacity += amount;
   //}

   if (Network.isServer)
   {
      for (var pd : PlayerData in players.Values)
      {
         if (forAttackers && pd.isAttacker)
         {
            if (isNewValue)
               pd.creditCapacity = amount;
            else
               pd.creditCapacity += amount;
         }
      }
      netView.RPC("CreditCapacityChange", RPCMode.Others, forAttackers, isNewValue, amount);
   }
}

function CanPlayerAfford(credits : int) : boolean
{
   return (Game.player.credits >= credits);
}

function CanClientAfford(netPlayer : NetworkPlayer, credits : int) : boolean
{
   return (players[netPlayer].credits >= credits);
}
