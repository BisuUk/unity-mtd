#pragma strict
import System.Collections.Generic;

static var player : PlayerData;
static var map : MapData;
static var control : GameControl;
static var self : Game;
static var hostType : int;

function Awake()
{
   // Persist through all levels
   DontDestroyOnLoad(gameObject);

   //if (player == null)
   player = new PlayerData();
   player.nameID = "Player"; // crashes without
   player.selectedTowers = new List.<Tower>();

   //if (control == null)
   control = GetComponent(GameControl);
   //if (self == null)
   self = this;
}

function OnLevelWasLoaded()
{
   if (Application.loadedLevelName != "mainmenu")
      map = GameObject.Find("MapInfo").GetComponent(MapData);
   player.ClearSelectedTowers();
}

//----------------
// PLAYER DATA
//----------------

class PlayerData
{
   var nameID : String;
   var teamID : int;
   var isAttacker : boolean;
   var isReady : boolean;
   var isReadyToStartRound : boolean;
   var credits : int;
   var creditCapacity : int;
   var mana : float;
   var selectedEmitter : GameObject;
   var selectedTowers : List.<Tower>;
   var netPlayer : NetworkPlayer;

   function SelectTower(tower : Tower, append : boolean)
   {
      if (!append)
         ClearSelectedTowers();
      selectedTowers.Add(tower);
      tower.SetSelected(true);
   }

   function DeselectTower(tower : Tower)
   {
      tower.SetSelected(false);
      selectedTowers.Remove(tower);
   }

   function ClearSelectedTowers()
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i])
            selectedTowers[i].SetSelected(false);
      }
      selectedTowers.Clear();
   }
}