#pragma strict
import System.Collections.Generic;

static var player : PlayerData;
static var map : MapData;
static var control : GameControl;
static var costs : Costs;
static var prefab : PrefabData;
static var self : Game;
static var hostType : int;

static var defaultColor : Color = Color.blue;

function OnLevelWasLoaded()
{
   if (Application.loadedLevelName != "mainmenu")
      map = GameObject.Find("MapInfo").GetComponent(MapData);
   if (player)
      player.ClearAllSelections();
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
   costs = GetComponent(Costs);
   prefab = GetComponent(PrefabData);
   
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
   var isReadyToStart : boolean;
   var credits : int;
   var creditCapacity : int;
   var mana : float;
   var selectedStructure : Transform;
   var selectedUnits : List.<Unit>;
   var selectedTowers : List.<TowerSelection>;
   var netPlayer : NetworkPlayer;

   function SelectStructure(structure : Transform)
   {
      if (selectedStructure && selectedStructure != structure)
         selectedStructure.SendMessage("SetSelected", false, SendMessageOptions.DontRequireReceiver);
      selectedStructure = structure;
      if (selectedStructure)
         selectedStructure.SendMessage("SetSelected", true, SendMessageOptions.DontRequireReceiver);
   }

   function ClearSelectedStructure()
   {
      if (selectedStructure)
         selectedStructure.SendMessage("SetSelected", false, SendMessageOptions.DontRequireReceiver);
      selectedStructure = null;
   }

   function SelectTower(tower : Tower, append : boolean)
   {
      if (!append)
         ClearSelectedTowers();

      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i] && selectedTowers[i].selectionFor == tower)
            return;
      }

      // Create selection ghost, so we have a visual on attribute modifications
      var selectionTower : TowerSelection =
         GameObject.Instantiate(Game.prefab.Ability(tower.type), tower.transform.position, tower.transform.rotation).AddComponent(TowerSelection);
      selectionTower.SetSelectionFor(tower);
      selectedTowers.Add(selectionTower);
   }

   function DeselectTower(tower : Tower)
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i] && selectedTowers[i].selectionFor == tower)
         {
            selectedTowers[i].SetSelectionFor(null);
            GameObject.Destroy(selectedTowers[i].gameObject);
            selectedTowers.RemoveAt(i);
            return;
         }
      }
   }

   function SelectTowerType(towerType : int)
   {
      ClearSelectedTowers();
      var objs: GameObject[] = GameObject.FindGameObjectsWithTag("TOWER");
      for (var go : GameObject in objs)
      {
         var tower : Tower = go.GetComponent(Tower);
         if (tower.type == towerType)
            SelectTower(tower, true);
      }
   }

   function FilterTowerType(towerType : int)
   {
      for (var i : int = selectedTowers.Count-1; i >= 0; --i)
      {
         if (selectedTowers[i] && selectedTowers[i].selectionFor.type != towerType)
         {
            selectedTowers[i].SetSelectionFor(null);
            GameObject.Destroy(selectedTowers[i].gameObject);
            selectedTowers.RemoveAt(i);
         }
      }
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
      }
      selectedTowers.Clear();
   }

   function DeselectUnit(unit : Unit) : boolean
   {
      if (unit)
         unit.SetSelected(false);
      return selectedUnits.Remove(unit);
   }

   function FilterUnitType(unitType : int)
   {
      ClearSelectedStructure();
      for (var i : int = selectedUnits.Count-1; i >= 0; --i)
      {
         if (selectedUnits[i] && selectedUnits[i].unitType != unitType)
         {
            selectedUnits[i].SetSelected(false);
            selectedUnits.RemoveAt(i);
         }
      }
   }

   function SelectUnitType(unitType : int)
   {
      ClearSelectedStructure();
      ClearSelectedUnits();
      var objs: GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
      for (var go : GameObject in objs)
      {
         var unit : Unit = go.GetComponent(Unit);
         if (unit.unitType == unitType)
            SelectUnit(unit, true);
      }
   }

   function SelectUnit(unit : Unit, append : boolean)
   {
      ClearSelectedStructure();
      if (!append)
         ClearSelectedUnits();
      if (!selectedUnits.Contains(unit))
      {
         unit.SetSelected(true);
         selectedUnits.Add(unit);
      }
   }

   function ClearSelectedUnits()
   {
      for (var i : int = selectedUnits.Count-1; i >= 0; --i)
      {
         if (selectedUnits[i])
            selectedUnits[i].SetSelected(false);
      }
      selectedUnits.Clear();
   }

   function ClearAllSelections()
   {
      ClearSelectedUnits();
      ClearSelectedTowers();
      SelectStructure(null);
   }
}