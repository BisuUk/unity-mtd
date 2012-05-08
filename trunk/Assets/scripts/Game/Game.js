#pragma strict

static var player : PlayerData;
static var map : MapData;
static var control : GameControl;
static var self : Game;
static var hostType : int;


function Awake()
{
   if (player == null)
      player = GetComponent(PlayerData);
   if (map == null)
      map = GetComponent(MapData);
   if (control == null)
      control = GetComponent(GameControl);
   if (self == null)
      self = this;
}

