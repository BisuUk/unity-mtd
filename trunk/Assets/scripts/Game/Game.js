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

   //if (control == null)
   control = GetComponent(GameControl);
   //if (self == null)
   self = this;
}

function OnLevelWasLoaded()
{
   map = GameObject.Find("MapInfo").GetComponent(MapData);
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
   var selectedTower : GameObject;
   var netPlayer : NetworkPlayer;
}
