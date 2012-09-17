#pragma strict
import System.Collections.Generic;

static var player : PlayerData;
static var map : MapData;
static var control : GameControl;
static var self : Game;
static var hostType : int;


function OnLevelWasLoaded()
{
   if (Application.loadedLevelName != "mainmenu")
      map = GameObject.Find("MapInfo").GetComponent(MapData);
   if (player)
      player.ClearSelectedTowers();
}

function Awake()
{
   if (self)
   {
      // Destroy this gamedata, one already exists (persisted from previous scene)
      Destroy(gameObject);
      return;
   }

   self = this;
   control = GetComponent(GameControl);

   player = new PlayerData();
   player.nameID = "Player"; // crashes without
   player.selectedTowers = new List.<TowerSelection>();
   player.selectedUnits = new List.<Unit>();

   // Persist through all levels
   DontDestroyOnLoad(gameObject);
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
   var selectedEmitter : Emitter;
   var selectedUnits : List.<Unit>;
   var selectedTowers : List.<TowerSelection>;
   var netPlayer : NetworkPlayer;

   function SelectTower(tower : Tower, append : boolean)
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i] && selectedTowers[i].selectionFor == tower)
            return;
      }

      if (!append)
         ClearSelectedTowers();

      // Create selection ghost, so we have a visual on attribute modifications
      var selectionTower : TowerSelection =
         GameObject.Instantiate(Resources.Load(TowerUtil.PrefabName(tower.type), GameObject), tower.transform.position, tower.transform.rotation).AddComponent(TowerSelection);
      selectionTower.SetSelectionFor(tower);
      selectedTowers.Add(selectionTower);
   }

   function RefreshTowerSelections()
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         selectedTowers[i].SetSelectionFor(selectedTowers[i].selectionFor);
      }
   }

   function DeselectTower(tower : Tower)
   {
      //tower.SetSelected(false);
      //selectedTowers.Remove(tower);
   }

   function ClearSelectedTowers()
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i])
         {
            selectedTowers[i].SetSelectionFor(null);
            GameObject.Destroy(selectedTowers[i].gameObject);
         }
            //selectedTowers[i].SetSelected(false);
      }
      selectedTowers.Clear();
   }

   function SelectUnit(unit : Unit, append : boolean)
   {
      if (!append)
         ClearSelectedUnits();
      if (!selectedUnits.Contains(unit))
         selectedUnits.Add(unit);
   }

   function ClearSelectedUnits()
   {
      selectedUnits.Clear();
   }
}