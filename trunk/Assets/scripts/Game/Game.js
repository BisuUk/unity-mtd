#pragma strict

static var player : PlayerData;
static var map : MapData;
static var control : GameControl;
static var self : Game;
static var hostType : int;

function Awake()
{
   // Persist through all levels
   DontDestroyOnLoad(gameObject);

   if (player == null)
      player = GetComponent(PlayerData);
   if (control == null)
      control = GetComponent(GameControl);
   if (self == null)
      self = this;
}

function OnLevelWasLoaded()
{
   map = GameObject.Find("MapInfo").GetComponent(MapData);
}
