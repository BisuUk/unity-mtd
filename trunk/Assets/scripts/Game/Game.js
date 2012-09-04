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
   player.selectedTowers = new List.<Tower>();

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
   var selectedEmitter : GameObject;
   var selectedTowers : List.<Tower>;
   var netPlayer : NetworkPlayer;

   function SelectTower(tower : Tower, append : boolean)
   {
      if (!append)
         ClearSelectedTowers();

      var ghostedTower : Tower = Instantiate(tower.gameObject, tower.transform.position, tower.transform.rotation).GetComponent(Tower);

      var c : Color = ghostedTower.color;
      c.a = 0.5;
      ghostedTower.SetChildrenMaterialColor(ghostedTower.transform, ghostedTower.constructingMaterial, c, true);

      selectedTowers.Add(ghostedTower);
      ghostedTower.SetSelected(true);
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
            Destroy(selectedTowers[i].gameObject);
            //selectedTowers[i].SetSelected(false);
      }
      selectedTowers.Clear();
   }
}